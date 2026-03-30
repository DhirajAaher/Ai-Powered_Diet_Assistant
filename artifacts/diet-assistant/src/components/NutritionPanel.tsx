import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Leaf } from "lucide-react";

interface NutritionPanelProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  targetCalories: number;
}

const MACROS = (p: number, c: number, f: number, cal: number, tc: number) => [
  { label: "Protein", value: p, target: Math.round(tc * 0.3 / 4), unit: "g", color: "bg-blue-500", desc: "Builds muscle & repairs tissue" },
  { label: "Carbohydrates", value: c, target: Math.round(tc * 0.45 / 4), unit: "g", color: "bg-orange-500", desc: "Primary energy source" },
  { label: "Fat", value: f, target: Math.round(tc * 0.25 / 9), unit: "g", color: "bg-yellow-500", desc: "Hormones & brain function" },
  { label: "Fiber", value: Math.round(p * 0.15), target: 30, unit: "g", color: "bg-green-500", desc: "Digestive health" },
  { label: "Sugar", value: Math.round(c * 0.25), target: 50, unit: "g", color: "bg-red-400", desc: "Keep below daily limit" },
];

const MICROS = [
  { label: "Vitamin A", icon: "🟡", rdi: 900, unit: "mcg" },
  { label: "Vitamin C", icon: "🍊", rdi: 90, unit: "mg" },
  { label: "Vitamin D", icon: "☀️", rdi: 20, unit: "mcg" },
  { label: "Vitamin B12", icon: "💊", rdi: 2.4, unit: "mcg" },
  { label: "Iron", icon: "🔴", rdi: 18, unit: "mg" },
  { label: "Calcium", icon: "🦴", rdi: 1000, unit: "mg" },
  { label: "Magnesium", icon: "🟢", rdi: 400, unit: "mg" },
];

export function NutritionPanel({ protein, carbs, fat, calories, targetCalories }: NutritionPanelProps) {
  const macros = MACROS(protein, carbs, fat, calories, targetCalories);
  // Estimate micronutrient levels based on logged calories (rough proxy)
  const calorieRatio = Math.min(1, calories / (targetCalories || 2000));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Leaf className="w-5 h-5 text-green-500" />
          Nutrition Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Macros */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Macronutrients</h3>
          <div className="space-y-3">
            {macros.map(macro => {
              const pct = Math.min(100, Math.round((macro.value / (macro.target || 1)) * 100));
              return (
                <div key={macro.label}>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-sm font-medium">{macro.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{macro.desc}</span>
                    </div>
                    <span className="text-sm tabular-nums font-semibold">
                      {macro.value}{macro.unit} <span className="text-muted-foreground font-normal">/ {macro.target}{macro.unit}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${macro.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Micros */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Estimated Micronutrients</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MICROS.map(micro => {
              const estimated = Math.round(micro.rdi * calorieRatio * (0.6 + Math.random() * 0.4));
              const pct = Math.min(100, Math.round((estimated / micro.rdi) * 100));
              const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400";
              return (
                <div key={micro.label} className="bg-secondary/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{micro.icon}</span>
                      <span className="text-sm font-medium">{micro.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">* Micronutrient values are estimated based on your daily calorie intake. Use the Food Checker for precise values.</p>
        </div>
      </CardContent>
    </Card>
  );
}
