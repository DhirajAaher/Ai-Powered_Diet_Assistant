import { useGetTodayLog, useGetProfile, useListWeightLogs } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Flame, Droplets, ArrowRight, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const headers = { request: { headers: getAuthHeaders() } };
  const { data: log, isLoading: logLoading } = useGetTodayLog(headers);
  const { data: profile, isLoading: profileLoading } = useGetProfile(headers);
  const { data: weights, isLoading: weightsLoading } = useListWeightLogs(headers);

  const isLoading = logLoading || profileLoading || weightsLoading;

  if (isLoading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-10 w-48 bg-muted rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 bg-muted rounded-2xl"></div>
        <div className="h-64 bg-muted rounded-2xl"></div>
        <div className="h-64 bg-muted rounded-2xl"></div>
      </div>
    </div>;
  }

  // Fallbacks if data doesn't exist yet
  const targetCalories = profile?.dailyCalorieTarget || 2000;
  const consumedCalories = log?.totalCalories || 0;
  const percentage = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
  
  const macros = [
    { label: "Protein", value: log?.totalProteinGrams || 0, target: 120, color: "bg-blue-500" },
    { label: "Carbs", value: log?.totalCarbsGrams || 0, target: 200, color: "bg-orange-500" },
    { label: "Fat", value: log?.totalFatGrams || 0, target: 65, color: "bg-yellow-500" },
  ];

  const weightData = (weights || []).slice(0, 7).reverse().map(w => ({
    date: format(parseISO(w.loggedAt), 'MMM dd'),
    weight: w.weightKg
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Today's Overview</h1>
          <p className="text-muted-foreground mt-1">Track your progress and stay on top of your goals.</p>
        </div>
        <Link href="/tracker">
          <Button className="rounded-full shadow-lg hover:-translate-y-0.5 transition-transform">
            Log Activity <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calories Ring */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="w-5 h-5 text-orange-500" /> Calories
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" className="stroke-muted fill-none" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-primary fill-none transition-all duration-1000 ease-out" 
                    strokeWidth="8" 
                    strokeDasharray={`${percentage * 2.51} 251`} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-display font-bold text-foreground">{consumedCalories}</span>
                  <span className="text-xs block text-muted-foreground mt-1">/ {targetCalories} kcal</span>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                {targetCalories - consumedCalories > 0 
                  ? `${targetCalories - consumedCalories} kcal remaining`
                  : "Daily goal reached!"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Macros */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full border-0 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" /> Macronutrients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {macros.map(m => (
                <div key={m.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground">{m.value}g / {m.target}g</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${m.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Water */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full border-0 shadow-lg shadow-black/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-500/5 -z-10" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Droplets className="w-5 h-5 text-blue-500" /> Hydration
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-4">
              <div className="text-4xl font-display font-bold text-blue-500">
                {log?.totalWaterMl || 0} <span className="text-xl text-blue-400">ml</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mb-6">Daily target: {log?.waterTarget || 2000} ml</p>
              
              <div className="w-full h-12 bg-blue-100 dark:bg-blue-950 rounded-2xl overflow-hidden relative border border-blue-200 dark:border-blue-900 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((log?.totalWaterMl || 0) / (log?.waterTarget || 2000)) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-400 to-blue-500"
                >
                  <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==')] mix-blend-overlay" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Meals */}
        <Card className="border-0 shadow-lg shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Meals</CardTitle>
              <CardDescription>What you've eaten today</CardDescription>
            </div>
            <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {log?.meals && log.meals.length > 0 ? (
              <div className="space-y-4">
                {log.meals.map(meal => (
                  <div key={meal.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                    <div>
                      <p className="font-semibold capitalize">{meal.foodName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{meal.mealType} • {meal.portionSize}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{meal.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">P: {meal.proteinGrams}g • C: {meal.carbsGrams}g</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <UtensilsCrossed className="w-6 h-6 opacity-50" />
                </div>
                <p>No meals logged today</p>
                <Link href="/tracker" className="text-primary text-sm mt-2 font-medium hover:underline">Log your first meal</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weight Trend */}
        <Card className="border-0 shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle>Weight Trend</CardTitle>
            <CardDescription>Past 7 days progress</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {weightData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm flex-col">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p>Not enough data for chart.</p>
                <p className="text-xs mt-1">Log your weight for a few days to see trends.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
