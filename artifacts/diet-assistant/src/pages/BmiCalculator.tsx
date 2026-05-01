import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, Scale, Calculator, Flame, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVITY_MULTIPLIERS: Record<string, { label: string; value: number }> = {
  sedentary: { label: "Sedentary (desk job, no exercise)", value: 1.2 },
  lightly_active: { label: "Lightly Active (1-3 days/week)", value: 1.375 },
  moderately_active: { label: "Moderately Active (3-5 days/week)", value: 1.55 },
  very_active: { label: "Very Active (6-7 days/week)", value: 1.725 },
  extra_active: { label: "Extra Active (athlete / 2x/day)", value: 1.9 },
};

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "bg-blue-100 text-blue-800 border-blue-200", ring: "stroke-blue-400" };
  if (bmi < 25) return { label: "Normal Weight", color: "bg-green-100 text-green-800 border-green-200", ring: "stroke-green-400" };
  if (bmi < 30) return { label: "Overweight", color: "bg-yellow-100 text-yellow-800 border-yellow-200", ring: "stroke-yellow-400" };
  return { label: "Obese", color: "bg-red-100 text-red-800 border-red-200", ring: "stroke-red-400" };
}

export default function BmiCalculator() {
  const [form, setForm] = useState({ age: "25", gender: "male", heightCm: "170", weightKg: "70", activity: "moderately_active" });
  const [results, setResults] = useState<null | { bmi: number; bmr: number; tdee: number; category: ReturnType<typeof getBmiCategory> }>(null);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    const age = parseInt(form.age);
    const h = parseFloat(form.heightCm);
    const w = parseFloat(form.weightKg);
    const bmr = form.gender === "male"
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161;
    const bmi = w / ((h / 100) ** 2);
    const tdee = bmr * ACTIVITY_MULTIPLIERS[form.activity].value;
    setResults({ bmi: Math.round(bmi * 10) / 10, bmr: Math.round(bmr), tdee: Math.round(tdee), category: getBmiCategory(bmi) });
  }

  const bmiPercent = results ? Math.min(100, Math.max(0, ((results.bmi - 10) / 30) * 100)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" /> BMI & BMR Calculator
        </h1>
        <p className="text-muted-foreground mt-1">Calculate your Body Mass Index, Basal Metabolic Rate, and daily calorie needs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card className="border-0 shadow-xl">
          <CardHeader><CardTitle>Your Measurements</CardTitle><CardDescription>Enter your details for accurate calculations</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={calculate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" min="1" max="120" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" step="0.1" min="50" max="300" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" step="0.1" min="1" max="500" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}>
                  {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full mt-2" size="lg">Calculate</Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              {/* BMI Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-6 flex items-center gap-6">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-muted fill-none" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" className={`${results.category.ring} fill-none transition-all duration-1000`} strokeWidth="8" strokeDasharray={`${bmiPercent * 2.51} 251`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-black">{results.bmi}</div>
                        <div className="text-xs text-muted-foreground">BMI</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Body Mass Index</div>
                    <Badge className={`text-sm px-3 py-1 border ${results.category.color}`}>{results.category.label}</Badge>
                    <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                      <div>Underweight: &lt;18.5 · Normal: 18.5–24.9</div>
                      <div>Overweight: 25–29.9 · Obese: ≥30</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* BMR & TDEE */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">BMR</span>
                    </div>
                    <div className="text-3xl font-black">{results.bmr.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">kcal/day at rest</div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">TDEE</span>
                    </div>
                    <div className="text-3xl font-black text-primary">{results.tdee.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">kcal/day with activity</div>
                  </CardContent>
                </Card>
              </div>

              {/* Calorie Targets */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />Calorie Targets by Goal</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {[
                      { label: "Weight Loss (−0.5 kg/wk)", kcal: results.tdee - 500, color: "text-blue-600" },
                      { label: "Mild Loss (−0.25 kg/wk)", kcal: results.tdee - 250, color: "text-sky-500" },
                      { label: "Maintenance", kcal: results.tdee, color: "text-green-600" },
                      { label: "Muscle Gain (+0.25 kg/wk)", kcal: results.tdee + 250, color: "text-orange-500" },
                      { label: "Bulking (+0.5 kg/wk)", kcal: results.tdee + 500, color: "text-red-500" },
                    ].map(goal => (
                      <div key={goal.label} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="text-sm">{goal.label}</span>
                        <span className={`font-bold text-sm ${goal.color}`}>{goal.kcal.toLocaleString()} kcal</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!results && (
          <div className="flex items-center justify-center h-full min-h-64 text-muted-foreground flex-col gap-3">
            <Activity className="w-16 h-16 opacity-20" />
            <p>Fill in your details and click Calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}
