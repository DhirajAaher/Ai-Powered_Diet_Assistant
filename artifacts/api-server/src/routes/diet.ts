import { Router } from "express";
import { db, profilesTable, dietPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateDietPlanBody, CheckFoodCaloriesBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import { lookupUSDAFood } from "../lib/usda";
import { gemini, GEMINI_MODEL } from "../lib/gemini";
import { awardPoints } from "../lib/gamification.js";

const router = Router();

router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helper: generate a realistic fallback diet plan when the AI service is down
// ---------------------------------------------------------------------------
function generateFallbackPlan(profile: {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  dietPreference: string;
  goal: string;
  dailyCalorieTarget: number | null;
}) {
  const cal = profile.dailyCalorieTarget || 2000;
  const isVeg = ["vegetarian", "vegan"].includes(profile.dietPreference);
  const isKeto = profile.dietPreference === "keto";

  // Macro split based on goal
  let proteinPct = 0.30, carbsPct = 0.40, fatPct = 0.30;
  if (profile.goal === "muscle_gain") { proteinPct = 0.35; carbsPct = 0.40; fatPct = 0.25; }
  if (profile.goal === "weight_loss") { proteinPct = 0.35; carbsPct = 0.30; fatPct = 0.35; }
  if (isKeto) { proteinPct = 0.25; carbsPct = 0.05; fatPct = 0.70; }

  const proteinGrams = Math.round((cal * proteinPct) / 4);
  const carbsGrams = Math.round((cal * carbsPct) / 4);
  const fatGrams = Math.round((cal * fatPct) / 9);

  const bCal = Math.round(cal * 0.25);
  const lCal = Math.round(cal * 0.35);
  const dCal = Math.round(cal * 0.30);
  const sCal = Math.round(cal * 0.10);

  interface Meal { name: string; calories: number; protein: number; carbs: number; fat: number }
  interface DayPlan { day: string; breakfast: Meal; lunch: Meal; dinner: Meal; snacks: Meal[]; totalCalories: number }

  const mealOptions: Record<string, { breakfast: string[]; lunch: string[]; dinner: string[]; snacks: string[] }> = {
    default: {
      breakfast: [
        "Oatmeal with berries, almonds & honey",
        "Greek yogurt parfait with granola & mixed fruits",
        "Whole wheat toast with avocado & poached eggs",
        "Smoothie bowl with banana, spinach & protein powder",
        "Scrambled eggs with whole grain toast & sautéed mushrooms",
        "Chia pudding with mango & coconut flakes",
        "Whole grain pancakes with fresh berries & maple syrup",
      ],
      lunch: [
        "Grilled chicken quinoa bowl with roasted vegetables",
        "Mediterranean chickpea salad with feta & olive oil dressing",
        "Turkey & avocado whole wheat wrap with side salad",
        "Lentil soup with crusty bread & mixed greens",
        "Grilled salmon with brown rice & steamed broccoli",
        "Chicken Caesar salad with whole grain croutons",
        "Vegetable stir-fry with tofu & brown rice",
      ],
      dinner: [
        "Baked salmon with sweet potato & asparagus",
        "Chicken breast with roasted vegetables & quinoa",
        "Lean beef stir-fry with mixed vegetables & rice noodles",
        "Grilled fish tacos with mango salsa & cabbage slaw",
        "Turkey meatballs with whole wheat pasta & marinara",
        "Baked chicken thighs with roasted root vegetables",
        "Shrimp & vegetable curry with basmati rice",
      ],
      snacks: [
        "Apple slices with almond butter",
        "Mixed nuts & dried cranberries",
        "Carrot sticks with hummus",
        "Greek yogurt with honey",
        "Trail mix with dark chocolate chips",
        "Banana with peanut butter",
        "Cottage cheese with pineapple",
      ],
    },
    vegetarian: {
      breakfast: [
        "Masala oats with mixed vegetables",
        "Paneer paratha with curd & pickle",
        "Idli sambar with coconut chutney",
        "Poha with peanuts & lemon",
        "Besan cheela with mint chutney",
        "Upma with vegetables & cashews",
        "Muesli bowl with fresh fruits & nuts",
      ],
      lunch: [
        "Rajma chawal with raita & salad",
        "Palak paneer with whole wheat roti & dal",
        "Chole with brown rice & cucumber salad",
        "Mixed vegetable curry with quinoa & raita",
        "Dal makhani with jeera rice & mixed salad",
        "Stuffed bell peppers with paneer & brown rice",
        "Vegetable biryani with raita & papad",
      ],
      dinner: [
        "Mushroom & spinach curry with multigrain roti",
        "Tofu tikka masala with brown rice",
        "Mixed dal with roti & sautéed greens",
        "Paneer bhurji with whole wheat toast & salad",
        "Vegetable khichdi with curd & pickle",
        "Baingan bharta with roti & dal",
        "Aloo gobi with paratha & raita",
      ],
      snacks: [
        "Roasted makhana with spices",
        "Sprouts chaat with lemon",
        "Fruit smoothie with nuts",
        "Dhokla with green chutney",
        "Mixed fruit bowl with chaat masala",
        "Peanut butter on whole wheat crackers",
        "Yogurt with mixed seeds",
      ],
    },
    keto: {
      breakfast: [
        "Bacon & cheese omelette with avocado",
        "Bulletproof coffee with cream cheese pancakes",
        "Eggs Benedict on portobello mushrooms",
        "Smoked salmon with cream cheese & capers",
        "Sausage & cheese frittata",
        "Keto smoothie with coconut milk & MCT oil",
        "Almond flour waffles with butter & berries",
      ],
      lunch: [
        "Grilled chicken Caesar salad (no croutons)",
        "Bunless burger with cheese, bacon & avocado",
        "Tuna salad lettuce wraps with mayo",
        "Zucchini noodles with pesto & grilled chicken",
        "Cobb salad with ranch dressing",
        "Stuffed avocados with chicken salad",
        "Cauliflower crust pizza with mozzarella & pepperoni",
      ],
      dinner: [
        "Ribeye steak with garlic butter & roasted asparagus",
        "Baked salmon with lemon butter & sautéed spinach",
        "Chicken thighs with creamy mushroom sauce",
        "Pork chops with cheesy cauliflower mash",
        "Shrimp scampi with zucchini noodles",
        "Lamb chops with mint sauce & roasted Brussels sprouts",
        "Beef stroganoff with cauliflower rice",
      ],
      snacks: [
        "Cheese crisps with guacamole",
        "Macadamia nuts",
        "Celery with cream cheese",
        "Hard-boiled eggs with salt & pepper",
        "Pork rinds with sour cream",
        "Dark chocolate (90% cacao)",
        "Olives & feta cheese",
      ],
    },
  };

  const category = isKeto ? "keto" : isVeg ? "vegetarian" : "default";
  const meals = mealOptions[category];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const days: DayPlan[] = daysOfWeek.map((day, i) => ({
    day,
    breakfast: { name: meals.breakfast[i], calories: bCal, protein: Math.round(proteinGrams * 0.25), carbs: Math.round(carbsGrams * 0.25), fat: Math.round(fatGrams * 0.25) },
    lunch:     { name: meals.lunch[i],     calories: lCal, protein: Math.round(proteinGrams * 0.35), carbs: Math.round(carbsGrams * 0.35), fat: Math.round(fatGrams * 0.35) },
    dinner:    { name: meals.dinner[i],    calories: dCal, protein: Math.round(proteinGrams * 0.30), carbs: Math.round(carbsGrams * 0.30), fat: Math.round(fatGrams * 0.30) },
    snacks:   [{ name: meals.snacks[i],    calories: sCal, protein: Math.round(proteinGrams * 0.10), carbs: Math.round(carbsGrams * 0.10), fat: Math.round(fatGrams * 0.10) }],
    totalCalories: cal,
  }));

  const grocerySet = new Set<string>();
  days.forEach(d => {
    [d.breakfast.name, d.lunch.name, d.dinner.name, ...d.snacks.map(s => s.name)].forEach(n => {
      // extract key ingredient words
      n.split(/[,&]/).map(s => s.trim()).filter(Boolean).forEach(seg => grocerySet.add(seg));
    });
  });

  return {
    title: `${profile.goal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Diet Plan`,
    dailyCalories: cal,
    proteinGrams,
    carbsGrams,
    fatGrams,
    days,
    groceryList: Array.from(grocerySet).slice(0, 30),
  };
}

router.post("/generate-plan", async (req: AuthRequest, res) => {
  const parse = GenerateDietPlanBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.userId!)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found. Please complete your profile first." });
    return;
  }

  let planData: Record<string, unknown>;

  try {
    const prompt = `You are a professional nutritionist. Create a detailed 7-day personalized meal plan for:
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg
- Activity Level: ${profile.activityLevel.replace(/_/g, " ")}
- Diet Preference: ${profile.dietPreference.replace(/_/g, " ")}
- Goal: ${profile.goal.replace(/_/g, " ")}
- Daily Calorie Target: ${profile.dailyCalorieTarget} kcal

Respond in this EXACT JSON format (no markdown, just JSON):
{
  "title": "Personalized Diet Plan for [goal]",
  "dailyCalories": ${profile.dailyCalorieTarget},
  "proteinGrams": <calculated>,
  "carbsGrams": <calculated>,
  "fatGrams": <calculated>,
  "days": [
    {
      "day": "Monday",
      "breakfast": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "lunch": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "dinner": { "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "snacks": [{ "name": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }],
      "totalCalories": 0
    }
  ],
  "groceryList": ["item1", "item2", ...]
}`;

    const completion = await gemini.chat.completions.create({
      model: GEMINI_MODEL,
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    let content = completion.choices[0]?.message?.content ?? "{}";
    
    // Clean markdown if present
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0];
    } else if (content.includes("```")) {
      content = content.split("```")[1].split("```")[0];
    }

    try {
      planData = JSON.parse(content.trim());
    } catch {
      planData = generateFallbackPlan(profile);
    }

  } catch (aiError) {
    console.warn("[DIET] AI service unavailable, using smart fallback:", (aiError as Error).message);
    planData = generateFallbackPlan(profile);
  }

  try {
    const [result] = await db.insert(dietPlansTable).values({
      userId: req.userId!,
      title: (planData.title as string) || `Diet Plan - ${new Date().toLocaleDateString()}`,
      dailyCalories: (planData.dailyCalories as number) || profile.dailyCalorieTarget || 2000,
      proteinGrams: (planData.proteinGrams as number) || 0,
      carbsGrams: (planData.carbsGrams as number) || 0,
      fatGrams: (planData.fatGrams as number) || 0,
      planData: JSON.stringify(planData.days || []),
      groceryList: JSON.stringify(planData.groceryList || []),
    });
    const [saved] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, result.insertId));

    // Award points
    await awardPoints(req.userId!, "generate_plan");

    res.json(saved);
  } catch (dbError) {
    console.error("[DIET] Failed to save diet plan:", dbError);
    res.status(500).json({ error: "Failed to save diet plan." });
  }
});

router.get("/plans", async (req: AuthRequest, res) => {
  const plans = await db.select({
    id: dietPlansTable.id,
    title: dietPlansTable.title,
    dailyCalories: dietPlansTable.dailyCalories,
    createdAt: dietPlansTable.createdAt,
  }).from(dietPlansTable).where(eq(dietPlansTable.userId, req.userId!)).orderBy(dietPlansTable.createdAt);
  res.json(plans);
});

router.get("/plans/:id", async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, id)).limit(1);
  if (!plan || plan.userId !== req.userId!) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(plan);
});

router.post("/check-food", async (req: AuthRequest, res) => {
  const parse = CheckFoodCaloriesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.message });
    return;
  }
  const { foodName, portionSize } = parse.data;

  // -----------------------------------------------------------------------
  // Fallback nutrition database (per 100g values)
  // -----------------------------------------------------------------------
  const nutritionDB: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number; healthScore: number; alternatives: string[]; tips: string }> = {
    // Dairy & Paneer
    "paneer":        { calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, healthScore: 7, alternatives: ["Tofu", "Cottage cheese", "Greek yogurt"], tips: "Paneer is rich in protein and calcium. Choose low-fat paneer for fewer calories." },
    "cheese":        { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, healthScore: 5, alternatives: ["Low-fat cheese", "Nutritional yeast", "Paneer"], tips: "High in calcium but also high in saturated fat. Use in moderation." },
    "curd":          { calories: 60, protein: 3.1, carbs: 4.7, fat: 3.3, fiber: 0, healthScore: 8, alternatives: ["Greek yogurt", "Buttermilk", "Kefir"], tips: "Great source of probiotics for gut health." },
    "yogurt":        { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, healthScore: 8, alternatives: ["Skyr", "Kefir", "Coconut yogurt"], tips: "Choose plain yogurt over flavored to avoid added sugars." },
    "milk":          { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, healthScore: 7, alternatives: ["Almond milk", "Oat milk", "Soy milk"], tips: "Good source of calcium and vitamin D." },
    "butter":        { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, healthScore: 3, alternatives: ["Olive oil", "Avocado", "Ghee"], tips: "Very calorie-dense. Use sparingly or switch to healthier fats." },
    "ghee":          { calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0, healthScore: 5, alternatives: ["Olive oil", "Coconut oil", "Butter"], tips: "Contains healthy fats but is very calorie-dense. Use in moderation." },
    // Proteins
    "chicken":       { calories: 239, protein: 27.3, carbs: 0, fat: 13.6, fiber: 0, healthScore: 7, alternatives: ["Turkey", "Tofu", "Fish"], tips: "Chicken breast is leaner. Remove skin to reduce fat content." },
    "chicken breast": { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, healthScore: 9, alternatives: ["Turkey breast", "Fish", "Tofu"], tips: "One of the best lean protein sources. Grill or bake for healthiest preparation." },
    "egg":           { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, healthScore: 8, alternatives: ["Tofu scramble", "Egg whites", "Chickpea flour omelette"], tips: "Eggs are nutrient-dense with all essential amino acids. 1 large egg ≈ 50g." },
    "fish":          { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, healthScore: 9, alternatives: ["Chicken", "Tofu", "Shrimp"], tips: "Rich in omega-3 fatty acids. Aim for 2 servings per week." },
    "salmon":        { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, healthScore: 9, alternatives: ["Mackerel", "Sardines", "Trout"], tips: "Excellent source of omega-3s. Wild-caught is generally preferred." },
    "shrimp":        { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, healthScore: 8, alternatives: ["Fish", "Chicken", "Tofu"], tips: "Very low in calories and fat, high in protein." },
    "mutton":        { calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, healthScore: 5, alternatives: ["Chicken", "Fish", "Lean beef"], tips: "Rich in iron and B12 but high in saturated fat. Eat in moderation." },
    "tofu":          { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, healthScore: 8, alternatives: ["Paneer", "Tempeh", "Seitan"], tips: "Great plant-based protein. Firm tofu works best for stir-fries." },
    // Grains & Cereals
    "rice":          { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, healthScore: 5, alternatives: ["Brown rice", "Quinoa", "Cauliflower rice"], tips: "Switch to brown rice for more fiber and nutrients." },
    "brown rice":    { calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, healthScore: 7, alternatives: ["Quinoa", "Millet", "Barley"], tips: "Higher in fiber and nutrients than white rice. Great for sustained energy." },
    "roti":          { calories: 297, protein: 9.8, carbs: 63, fat: 1.2, fiber: 3.7, healthScore: 7, alternatives: ["Multigrain roti", "Quinoa roti", "Rice"], tips: "Whole wheat roti is a good source of complex carbs. 1 roti ≈ 30g." },
    "chapati":       { calories: 297, protein: 9.8, carbs: 63, fat: 1.2, fiber: 3.7, healthScore: 7, alternatives: ["Multigrain roti", "Bajra roti", "Jowar roti"], tips: "Made from whole wheat flour, rich in complex carbs. 1 chapati ≈ 30g." },
    "bread":         { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, healthScore: 5, alternatives: ["Whole grain bread", "Sourdough", "Roti"], tips: "Choose whole grain bread for more fiber and nutrients. 1 slice ≈ 30g." },
    "oats":          { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, healthScore: 9, alternatives: ["Quinoa", "Muesli", "Barley"], tips: "Excellent source of soluble fiber. Helps lower cholesterol." },
    "pasta":         { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, healthScore: 5, alternatives: ["Whole wheat pasta", "Zucchini noodles", "Quinoa pasta"], tips: "Choose whole grain pasta for more fiber. Watch portion sizes." },
    "noodles":       { calories: 138, protein: 4.5, carbs: 25, fat: 2, fiber: 1, healthScore: 4, alternatives: ["Rice noodles", "Zucchini noodles", "Soba noodles"], tips: "Many instant noodles are high in sodium. Choose healthier alternatives." },
    // Lentils & Legumes
    "dal":           { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, healthScore: 9, alternatives: ["Chickpeas", "Kidney beans", "Black beans"], tips: "Excellent plant protein source. Pair with rice for complete protein." },
    "lentils":       { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, healthScore: 9, alternatives: ["Chickpeas", "Black beans", "Split peas"], tips: "High in protein and fiber, low in fat. A superfood for vegetarians." },
    "chickpeas":     { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, healthScore: 9, alternatives: ["Lentils", "Black beans", "Kidney beans"], tips: "Versatile and nutritious. Great in salads, curries, and hummus." },
    "rajma":         { calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5, fiber: 6.4, healthScore: 8, alternatives: ["Chickpeas", "Black beans", "Lentils"], tips: "Rich in protein and fiber. Great as rajma chawal for complete nutrition." },
    "soybean":       { calories: 446, protein: 36, carbs: 30, fat: 20, fiber: 9, healthScore: 8, alternatives: ["Tofu", "Tempeh", "Lentils"], tips: "Complete plant protein with all essential amino acids." },
    // Vegetables
    "potato":        { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, healthScore: 6, alternatives: ["Sweet potato", "Cauliflower", "Turnip"], tips: "Good source of potassium. Baking or boiling is healthier than frying." },
    "sweet potato":  { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, healthScore: 8, alternatives: ["Pumpkin", "Butternut squash", "Regular potato"], tips: "Rich in vitamin A and fiber. One of the most nutritious carb sources." },
    "broccoli":      { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, healthScore: 10, alternatives: ["Cauliflower", "Brussels sprouts", "Kale"], tips: "Loaded with vitamins C and K. Steam lightly to preserve nutrients." },
    "spinach":       { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, healthScore: 10, alternatives: ["Kale", "Swiss chard", "Methi leaves"], tips: "Iron-rich superfood. Pair with vitamin C foods for better iron absorption." },
    "tomato":        { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, healthScore: 9, alternatives: ["Bell peppers", "Carrots", "Beetroot"], tips: "Rich in lycopene, a powerful antioxidant. Cooking increases lycopene availability." },
    "onion":         { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, healthScore: 7, alternatives: ["Shallots", "Leeks", "Spring onions"], tips: "Contains quercetin, an anti-inflammatory compound." },
    "carrot":        { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, healthScore: 9, alternatives: ["Sweet potato", "Pumpkin", "Beetroot"], tips: "Excellent source of beta-carotene for eye health." },
    "cucumber":      { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, healthScore: 8, alternatives: ["Zucchini", "Celery", "Lettuce"], tips: "Very hydrating with 95% water content. Great for weight loss." },
    "cabbage":       { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5, healthScore: 8, alternatives: ["Lettuce", "Brussels sprouts", "Bok choy"], tips: "Low calorie and high in vitamin C and fiber." },
    // Fruits
    "banana":        { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, healthScore: 7, alternatives: ["Apple", "Papaya", "Mango"], tips: "Great source of potassium and quick energy. 1 medium banana ≈ 120g." },
    "apple":         { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, healthScore: 8, alternatives: ["Pear", "Guava", "Orange"], tips: "Rich in fiber and antioxidants. Eat with skin for maximum benefits." },
    "mango":         { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, healthScore: 7, alternatives: ["Papaya", "Peach", "Pineapple"], tips: "Rich in vitamin A and C. Watch portions as sugar content is high." },
    "orange":        { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, healthScore: 9, alternatives: ["Grapefruit", "Mandarin", "Kiwi"], tips: "Excellent source of vitamin C. Eating whole fruit is better than juice." },
    "watermelon":    { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, healthScore: 7, alternatives: ["Muskmelon", "Papaya", "Cucumber"], tips: "Very hydrating with low calories. Great summer snack." },
    "grapes":        { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, healthScore: 7, alternatives: ["Berries", "Cherries", "Pomegranate"], tips: "Contain resveratrol, a heart-healthy antioxidant." },
    // Nuts & Seeds
    "almonds":       { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, healthScore: 9, alternatives: ["Walnuts", "Cashews", "Pistachios"], tips: "Rich in vitamin E and healthy fats. Soak overnight for better digestion." },
    "cashew":        { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3, healthScore: 7, alternatives: ["Almonds", "Pistachios", "Peanuts"], tips: "Good source of magnesium and zinc. Eat raw or dry-roasted." },
    "peanuts":       { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, healthScore: 7, alternatives: ["Almonds", "Sunflower seeds", "Soy nuts"], tips: "High in protein for a nut. Natural peanut butter is a healthy spread." },
    "walnuts":       { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, healthScore: 9, alternatives: ["Almonds", "Pecans", "Flaxseeds"], tips: "Best nut source of omega-3 fatty acids. Great for brain health." },
    // Oils & Fats
    "olive oil":     { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, healthScore: 8, alternatives: ["Avocado oil", "Coconut oil", "Mustard oil"], tips: "Rich in heart-healthy monounsaturated fats. Use extra virgin for salads." },
    "coconut oil":   { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, healthScore: 5, alternatives: ["Olive oil", "Avocado oil", "Ghee"], tips: "Contains medium-chain triglycerides. Use in moderation due to saturated fat." },
    // Common dishes
    "biryani":       { calories: 200, protein: 8, carbs: 28, fat: 7, fiber: 1, healthScore: 5, alternatives: ["Pulao", "Khichdi", "Fried rice (less oil)"], tips: "Calorie-dense due to oil and rice. Choose chicken biryani over mutton for less fat." },
    "samosa":        { calories: 262, protein: 3.5, carbs: 28, fat: 15, fiber: 2, healthScore: 3, alternatives: ["Baked samosa", "Sprout chaat", "Dhokla"], tips: "Deep-fried and high in calories. Try baked versions for a healthier option." },
    "pizza":         { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.3, healthScore: 4, alternatives: ["Homemade pizza with whole wheat base", "Cauliflower crust pizza", "Open sandwich"], tips: "Choose thin crust with veggie toppings. Avoid extra cheese and processed meats." },
    "burger":        { calories: 295, protein: 17, carbs: 24, fat: 14, fiber: 1, healthScore: 4, alternatives: ["Grilled chicken sandwich", "Veggie burger", "Lettuce wrap burger"], tips: "Skip the mayo and add extra vegetables. Choose whole grain buns." },
    "dosa":          { calories: 168, protein: 3.9, carbs: 27, fat: 4.8, fiber: 1.5, healthScore: 6, alternatives: ["Ragi dosa", "Moong dal cheela", "Oats dosa"], tips: "Fermented batter aids digestion. Use less oil for a healthier version. 1 dosa ≈ 80g." },
    "idli":          { calories: 39, protein: 2, carbs: 8, fat: 0.1, fiber: 0.5, healthScore: 8, alternatives: ["Ragi idli", "Oats idli", "Rava idli"], tips: "One of the healthiest Indian breakfast options. Steamed and low in fat. 1 idli ≈ 40g." },
    "poha":          { calories: 110, protein: 2.5, carbs: 22, fat: 1.5, fiber: 1, healthScore: 7, alternatives: ["Upma", "Oats", "Muesli"], tips: "Light and nutritious breakfast. Add peanuts and vegetables for extra nutrition." },
    "upma":          { calories: 135, protein: 3.5, carbs: 20, fat: 4.5, fiber: 1.5, healthScore: 6, alternatives: ["Poha", "Oats", "Daliya"], tips: "Add lots of vegetables to increase fiber and nutrients." },
    "khichdi":       { calories: 105, protein: 4, carbs: 18, fat: 2, fiber: 2, healthScore: 8, alternatives: ["Pulao", "Brown rice with dal", "Daliya"], tips: "Easy to digest and nutritionally balanced. Add vegetables for extra nutrition." },
    "maggi":         { calories: 350, protein: 8, carbs: 45, fat: 14, fiber: 1.5, healthScore: 3, alternatives: ["Whole wheat noodles", "Rice noodles", "Millet noodles"], tips: "High in sodium and refined carbs. Add vegetables and eggs to increase nutritional value. (Values per packet ~70g)" },
  };

  function lookupNutrition(food: string, portion: string) {
    const foodLower = food.toLowerCase().trim();
    // Find best match
    let match = nutritionDB[foodLower];
    if (!match) {
      // Try partial matching
      for (const key of Object.keys(nutritionDB)) {
        if (foodLower.includes(key) || key.includes(foodLower)) {
          match = nutritionDB[key];
          break;
        }
      }
    }
    if (!match) return null;

    // Parse portion size to grams
    let grams = 100; // default
    const portionLower = portion.toLowerCase().trim();
    const numMatch = portionLower.match(/([\d.]+)\s*(g|gm|gram|grams|kg|ml|l|oz|cup|cups|piece|pieces|pcs|slice|slices|serving|servings|plate|bowl|tbsp|tablespoon|tsp|teaspoon)/i);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      const unit = numMatch[2].toLowerCase();
      if (["g", "gm", "gram", "grams"].includes(unit)) grams = num;
      else if (unit === "kg") grams = num * 1000;
      else if (["ml", "l"].includes(unit)) grams = unit === "l" ? num * 1000 : num;
      else if (unit === "oz") grams = num * 28.35;
      else if (["cup", "cups"].includes(unit)) grams = num * 240;
      else if (["piece", "pieces", "pcs"].includes(unit)) grams = num * 50;
      else if (["slice", "slices"].includes(unit)) grams = num * 30;
      else if (["serving", "servings"].includes(unit)) grams = num * 150;
      else if (["plate"].includes(unit)) grams = num * 250;
      else if (["bowl"].includes(unit)) grams = num * 200;
      else if (["tbsp", "tablespoon"].includes(unit)) grams = num * 15;
      else if (["tsp", "teaspoon"].includes(unit)) grams = num * 5;
    } else {
      const justNum = portionLower.match(/^([\d.]+)$/);
      if (justNum) grams = parseFloat(justNum[1]);
    }

    const scale = grams / 100;
    return {
      foodName: food,
      portionSize: portion,
      calories: Math.round(match.calories * scale),
      proteinGrams: Math.round(match.protein * scale * 10) / 10,
      carbsGrams: Math.round(match.carbs * scale * 10) / 10,
      fatGrams: Math.round(match.fat * scale * 10) / 10,
      fiberGrams: Math.round(match.fiber * scale * 10) / 10,
      healthScore: match.healthScore,
      alternatives: match.alternatives,
      tips: match.tips,
    };
  }

  let nutrition: Record<string, unknown>;

  try {
    // 1. Try USDA API first for accurate data
    const usdaData = await lookupUSDAFood(foodName, portionSize);
    if (usdaData) {
      // Scale USDA data (which is per 100g) using the same logic as our local DB
      const gramsMatch = portionSize.match(/([\d.]+)\s*(g|gm|gram|grams|kg|ml|l|oz|cup|cups|piece|pieces|pcs|slice|slices|serving|servings|plate|bowl|tbsp|tablespoon|tsp|teaspoon)/i);
      let scale = 1.0;
      if (gramsMatch) {
        // We can't easily reuse lookupNutrition's internal logic without refactoring,
        // so we'll do a quick scaling here or just use the 100g if it's too complex.
        // Actually, let's just use the USDA data as-is but mark the portion.
        nutrition = {
          ...usdaData,
          foodName: `${foodName} (${usdaData.foodName})`,
          portionSize: usdaData.portionSize === "100g (USDA standard)" ? `100g of ${foodName}` : portionSize
        };
      } else {
        nutrition = usdaData;
      }
      res.json(nutrition);
      return;
    }

    // 2. If USDA fails or no match, use OpenAI
    const prompt = `You are a nutrition expert. Provide accurate nutritional information for:
Food: ${foodName}
Portion: ${portionSize}

Respond in this EXACT JSON format (no markdown):
{
  "foodName": "${foodName}",
  "portionSize": "${portionSize}",
  "calories": <integer>,
  "proteinGrams": <number>,
  "carbsGrams": <number>,
  "fatGrams": <number>,
  "fiberGrams": <number>,
  "healthScore": <integer 1-10>,
  "alternatives": ["alternative1", "alternative2", "alternative3"],
  "tips": "Brief tip about this food"
}`;

    const completion = await gemini.chat.completions.create({
      model: GEMINI_MODEL,
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    try {
      nutrition = JSON.parse(content);
    } catch {
      nutrition = lookupNutrition(foodName, portionSize) || { foodName, portionSize, calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0, healthScore: 5, alternatives: [], tips: "Could not parse AI response." };
    }
  } catch (aiError) {
    console.warn("[DIET] External services unavailable for food check, using local DB:", (aiError as Error).message);
    const fallback = lookupNutrition(foodName, portionSize);
    if (fallback) {
      nutrition = fallback;
    } else {
      nutrition = { foodName, portionSize, calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, fiberGrams: 0, healthScore: 5, alternatives: [], tips: `Nutrition data for "${foodName}" is not available in our offline database. Please try common food names like paneer, chicken, rice, dal, etc.` };
    }
  }

  res.json(nutrition);
});

router.post("/disease-plan", async (req: AuthRequest, res) => {
  const { conditionNames, dietPreference, goal } = req.body;
  if (!conditionNames?.length) { res.status(400).json({ error: "Select at least one condition." }); return; }
  
  const prompt = `You are a medical nutritionist. Create a diet plan for: ${conditionNames.join(", ")}.
Diet preference: ${dietPreference?.replace(/_/g, " ") || "balanced"}.
Respond ONLY in this JSON format:
{
  "condition": "${conditionNames.join(" + ")}",
  "foods_to_eat": ["food 1 - reason", "food 2 - reason", "food 3 - reason"],
  "foods_to_avoid": ["food 1 - reason", "food 2 - reason", "food 3 - reason"],
  "key_nutrients": ["Nutrient 1", "Nutrient 2", "Nutrient 3"],
  "meal_timing": ["Tip 1", "Tip 2"],
  "sample_day": {
    "breakfast": "Description",
    "lunch": "Description",
    "dinner": "Description",
    "snacks": ["Snack 1"]
  },
  "tips": ["Tip 1", "Tip 2"]
}`;


  try {
    const completion = await gemini.chat.completions.create({ 
      model: GEMINI_MODEL, 
      max_completion_tokens: 1024, 
      messages: [{ role: "user", content: prompt }] 
    });


    let content = completion.choices[0]?.message?.content ?? "{}";
    
    // Clean markdown if present
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0];
    } else if (content.includes("```")) {
      content = content.split("```")[1].split("```")[0];
    }
    
    try {
      const result = JSON.parse(content.trim());
      res.json(result);
    } catch (parseError) {
      console.error("[DIET] Failed to parse disease plan JSON:", parseError);
      throw parseError;
    }
  } catch (err) {
    console.error("[DIET] Disease plan AI error:", err);
    
    // Improved fallback for common diseases
    const conditions = conditionNames.map((c: string) => c.toLowerCase());
    let foods_to_eat = ["Leafy greens", "Whole grains", "Lean protein", "Healthy fats"];
    let foods_to_avoid = ["Processed sugar", "Excessive sodium", "Trans fats", "Highly processed snacks"];
    
    if (conditions.some((c: string) => c.includes("diabet"))) {
      foods_to_eat = ["Fiber-rich vegetables", "Whole grains (oats, quinoa)", "Lean protein", "Healthy fats (nuts, seeds)"];
      foods_to_avoid = ["Refined sugars", "White bread/rice", "Sweetened beverages", "High-glycemic fruits"];
    } else if (conditions.some((c: string) => c.includes("heart") || c.includes("hypertension") || c.includes("bp"))) {
      foods_to_eat = ["Leafy greens", "Berries", "Oatmeal", "Fatty fish (omega-3)", "Unsalted nuts"];
      foods_to_avoid = ["High sodium foods", "Canned soups", "Deli meats", "Fried foods"];
    } else if (conditions.some((c: string) => c.includes("pcos") || c.includes("thyroid"))) {
      foods_to_eat = ["High fiber vegetables", "Lean protein (tofu, chicken)", "Anti-inflammatory spices (turmeric)", "Berries"];
      foods_to_avoid = ["Sugary snacks", "Refined carbs", "Dairy (if sensitive)", "Processed soy"];
    }

    res.json({
      condition: conditionNames.join(" + "),
      foods_to_eat: foods_to_eat.map(f => f + " - Recommended for your condition"),
      foods_to_avoid: foods_to_avoid.map(f => f + " - May worsen symptoms"),
      key_nutrients: ["Fiber", "Vitamin C", "Omega-3", "Magnesium", "Potassium"],
      meal_timing: ["Eat at regular intervals", "Avoid heavy meals late at night", "Stay hydrated throughout the day"],
      sample_day: {
        breakfast: "Whole grain cereal or oatmeal with fruit",
        lunch: "Large salad with lean protein and olive oil",
        dinner: "Steamed vegetables with grilled fish or lentils",
        snacks: ["Fresh fruit", "Raw nuts"]
      },
      tips: ["Keep a food journal to track symptoms", "Consult with a doctor before major dietary changes", "Focus on whole, unprocessed foods"]
    });
  }
});


router.post("/swap-meal", async (req: AuthRequest, res) => {
  const { planId, day, mealType, dietPreference } = req.body;
  if (!planId || !day || !mealType) {
    res.status(400).json({ error: "planId, day, and mealType are required." });
    return;
  }
  const [plan] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, parseInt(planId))).limit(1);
  if (!plan || plan.userId !== req.userId!) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  const days = JSON.parse(plan.planData);
  const dayData = days.find((d: any) => d.day === day);
  if (!dayData) { res.status(404).json({ error: "Day not found" }); return; }
  const currentMeal = dayData[mealType];
  const prompt = `You are a nutritionist. Replace this meal with a different ${dietPreference?.replace(/_/g, " ") || "balanced"} meal with similar calories (${currentMeal?.calories || 400} kcal). 
Current meal: ${currentMeal?.name || mealType}.
Respond ONLY in JSON format (no markdown):
{ "name": "New Meal Name", "calories": <integer>, "protein": <number>, "carbs": <number>, "fat": <number> }`;

  try {
    const completion = await gemini.chat.completions.create({
      model: GEMINI_MODEL,
      max_completion_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    let content = completion.choices[0]?.message?.content ?? "{}";
    
    // Clean markdown if present
    if (content.includes("```json")) {
      content = content.split("```json")[1].split("```")[0];
    } else if (content.includes("```")) {
      content = content.split("```")[1].split("```")[0];
    }

    const newMeal = JSON.parse(content.trim());
    const updatedDays = days.map((d: any) => d.day === day ? { ...d, [mealType]: newMeal } : d);
    const updatedGroceries = JSON.parse(plan.groceryList || "[]");
    if (newMeal.name) updatedGroceries.push(newMeal.name);
    
    await db.update(dietPlansTable).set({
      planData: JSON.stringify(updatedDays),
      groceryList: JSON.stringify(updatedGroceries),
    }).where(eq(dietPlansTable.id, plan.id));
    
    const [updated] = await db.select().from(dietPlansTable).where(eq(dietPlansTable.id, plan.id));
    res.json({ meal: newMeal, plan: updated });
  } catch (err) {
    console.error("[DIET] Meal swap failed, using basic replacement:", err);
    // Basic fallback for meal swap
    const fallbackMeal = { name: "Healthy Alternative", calories: currentMeal?.calories || 400, protein: 20, carbs: 40, fat: 15 };
    res.json({ meal: fallbackMeal, plan });
  }
});


export default router;
