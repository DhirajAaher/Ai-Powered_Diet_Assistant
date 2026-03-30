import { useState } from "react";
import { useCheckFoodCalories } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Info, Star, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FoodChecker() {
  const [food, setFood] = useState("");
  const [portion, setPortion] = useState("");
  
  const checkFood = useCheckFoodCalories({ request: { headers: getAuthHeaders() } });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!food || !portion) return;
    checkFood.mutate({ data: { foodName: food, portionSize: portion } });
  };

  const result = checkFood.data;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-4xl font-display font-bold mb-4">Smart Food Checker</h1>
        <p className="text-muted-foreground text-lg">Not sure how healthy a meal is? Describe it and let our AI analyze its nutritional value instantly.</p>
      </div>

      <Card className="border-0 shadow-xl shadow-black/5 bg-gradient-to-br from-card to-secondary/30 p-2 mb-10">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-muted-foreground w-5 h-5" />
            <Input 
              value={food} onChange={e => setFood(e.target.value)}
              placeholder="E.g. Avocado Toast with Egg" 
              className="pl-12 h-12 text-base rounded-xl bg-background border-0 shadow-inner"
              required
            />
          </div>
          <div className="md:w-64">
            <Input 
              value={portion} onChange={e => setPortion(e.target.value)}
              placeholder="Portion (e.g. 2 slices)" 
              className="h-12 text-base rounded-xl bg-background border-0 shadow-inner"
              required
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8 rounded-xl shadow-lg" disabled={checkFood.isPending}>
            {checkFood.isPending ? "Analyzing..." : "Analyze"}
          </Button>
        </form>
      </Card>

      <AnimatePresence>
        {result && !checkFood.isPending && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Primary Nutrition Card */}
            <Card className="md:col-span-2 border-0 shadow-xl shadow-black/5 overflow-hidden">
              <div className="bg-primary/5 p-6 border-b flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold capitalize">{result.foodName}</h2>
                  <p className="text-muted-foreground mt-1">{result.portionSize}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-display font-black text-primary">{result.calories}</div>
                  <div className="text-sm font-semibold text-muted-foreground">Calories</div>
                </div>
              </div>
              
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Macros Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Protein", value: result.proteinGrams, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Carbs", value: result.carbsGrams, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Fat", value: result.fatGrams, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                    { label: "Fiber", value: result.fiberGrams, color: "text-green-500", bg: "bg-green-500/10" },
                  ].map(macro => (
                    <div key={macro.label} className={`${macro.bg} rounded-xl p-4 flex flex-col items-center justify-center text-center`}>
                      <span className={`text-2xl font-bold ${macro.color}`}>{macro.value}g</span>
                      <span className="text-xs font-medium text-muted-foreground mt-1">{macro.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-secondary/50 rounded-xl p-4 flex gap-4 items-start">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{result.tips}</p>
                </div>
              </CardContent>
            </Card>

            {/* Health Score & Alternatives */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-primary to-accent text-white">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <h3 className="font-semibold opacity-90 mb-2">Health Score</h3>
                  <div className="flex gap-1 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-6 h-6 ${star <= Math.round(result.healthScore/2) ? 'fill-white text-white' : 'fill-white/20 text-white/20'}`} />
                    ))}
                  </div>
                  <div className="text-5xl font-display font-black">{result.healthScore}<span className="text-2xl opacity-70">/10</span></div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-black/5 h-full">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Healthier Alternatives</h3>
                  <ul className="space-y-3">
                    {result.alternatives.map((alt, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{alt}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
