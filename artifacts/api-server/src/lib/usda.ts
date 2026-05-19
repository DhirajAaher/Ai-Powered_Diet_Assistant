import { logger } from "./logger";

const USDA_API_KEY = process.env.USDA_API_KEY;

export interface NutritionInfo {
  foodName: string;
  portionSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  healthScore: number;
  alternatives: string[];
  tips: string;
}

/**
 * Searches for a food item in the USDA FoodData Central database and returns its nutritional information.
 */
export async function lookupUSDAFood(foodName: string, portionSize: string): Promise<NutritionInfo | null> {
  if (!USDA_API_KEY) {
    logger.warn("USDA_API_KEY is not set. Skipping USDA lookup.");
    return null;
  }

  try {
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(foodName)}&pageSize=1`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      logger.error(`USDA API search failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
      return null;
    }

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    // Helper to find nutrient value by name or ID
    const findNutrient = (nameOrId: string | number) => {
      const nutrient = nutrients.find((n: any) => 
        n.nutrientName.toLowerCase().includes(String(nameOrId).toLowerCase()) || 
        n.nutrientId === nameOrId ||
        n.nutrientNumber === String(nameOrId)
      );
      return nutrient ? nutrient.value : 0;
    };

    // USDA values are usually per 100g
    // We'll need to scale this if we knew the grams, but for now we'll return per 100g 
    // and let the caller handle portion scaling if needed, or we can try to parse portion here.
    
    const calories = findNutrient("Energy"); // 208
    const protein = findNutrient("Protein"); // 203
    const carbs = findNutrient("Carbohydrate, by difference"); // 205
    const fat = findNutrient("Total lipid (fat)"); // 204
    const fiber = findNutrient("Fiber, total dietary"); // 291

    // Simple health score logic
    let healthScore = 5;
    if (fiber > 5) healthScore += 1;
    if (protein > 15) healthScore += 1;
    if (fat < 5) healthScore += 1;
    if (carbs > 50) healthScore -= 1;
    healthScore = Math.max(1, Math.min(10, healthScore));

    return {
      foodName: food.description,
      portionSize: "100g (USDA standard)",
      calories: Math.round(calories),
      proteinGrams: Math.round(protein * 10) / 10,
      carbsGrams: Math.round(carbs * 10) / 10,
      fatGrams: Math.round(fat * 10) / 10,
      fiberGrams: Math.round(fiber * 10) / 10,
      healthScore,
      alternatives: [], // USDA doesn't provide alternatives
      tips: `Source: USDA FoodData Central (${food.dataType})`
    };
  } catch (error) {
    logger.error("Error calling USDA API:", error);
    return null;
  }
}
