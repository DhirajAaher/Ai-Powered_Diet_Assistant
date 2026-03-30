import { useState } from "react";
import { useGetProfile, useListDietPlans, useGenerateDietPlan } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, Sparkles, Check, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";

export default function DietPlan() {
  const { toast } = useToast();
  const headers = { request: { headers: getAuthHeaders() } };
  
  const { data: profile } = useGetProfile(headers);
  const { data: plans, isLoading: loadingPlans, refetch } = useListDietPlans(headers);
  const generatePlan = useGenerateDietPlan(headers);

  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");

  const handleGenerate = () => {
    if (!profile?.id) {
      toast({ title: "Profile incomplete", description: "Please complete your profile first." });
      return;
    }
    generatePlan.mutate({ data: { profileId: profile.id } }, {
      onSuccess: (data) => {
        toast({ title: "Success!", description: "New 7-day AI plan generated." });
        refetch();
        setActivePlanId(data.id);
      }
    });
  };

  const activePlan = plans?.find(p => p.id === activePlanId) || (plans && plans.length > 0 ? plans[0] : null);
  
  // Safely parse the planData string if it exists
  let parsedPlanData: any = null;
  if (activePlan && (activePlan as any).planData) {
    try {
      parsedPlanData = JSON.parse((activePlan as any).planData);
    } catch(e) { console.error("Failed to parse plan data"); }
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Your Diet Plans</h1>
          <p className="text-muted-foreground mt-1">Personalized weekly meals designed by AI.</p>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={generatePlan.isPending}
          size="lg"
          className="shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-accent border-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {generatePlan.isPending ? "Generating..." : "Generate New Plan"}
        </Button>
      </div>

      {!loadingPlans && plans?.length === 0 && !generatePlan.isPending && (
        <Card className="border-dashed border-2 bg-transparent shadow-none mt-8 text-center py-16">
          <CalendarRange className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Plans Yet</h2>
          <p className="text-muted-foreground mb-6">Generate your first AI-powered weekly meal plan based on your profile goals.</p>
          <Button onClick={handleGenerate} variant="outline">Generate First Plan</Button>
        </Card>
      )}

      {loadingPlans && <div className="animate-pulse h-96 bg-muted rounded-2xl mt-8"></div>}

      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar / List of Plans */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground px-2">History</h3>
            <div className="space-y-2">
              {plans?.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    (activePlanId ? plan.id === activePlanId : plan.id === activePlan.id)
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-card hover:border-border hover:bg-secondary/50'
                  }`}
                >
                  <div className="font-semibold text-sm truncate">{plan.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                    <span>{format(parseISO(plan.createdAt), 'MMM dd, yyyy')}</span>
                    <span className="text-primary font-medium">{plan.dailyCalories} kcal</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Plan Detail */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl shadow-black/5 overflow-hidden">
              <div className="bg-primary/10 p-6 sm:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-primary/10">
                <div>
                  <h2 className="text-2xl font-display font-bold text-primary">{activePlan.title}</h2>
                  <p className="text-sm font-medium mt-1 opacity-80">Created on {format(parseISO(activePlan.createdAt), 'MMMM dd, yyyy')}</p>
                </div>
                <div className="flex gap-4 bg-white/50 dark:bg-black/20 p-3 rounded-xl backdrop-blur-sm">
                  <div className="text-center px-2">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Calories</div>
                    <div className="font-bold text-lg">{activePlan.dailyCalories}</div>
                  </div>
                </div>
              </div>

              {parsedPlanData ? (
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Days Nav */}
                  <div className="sm:w-48 bg-secondary/30 p-4 border-r flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-visible">
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-left ${
                          selectedDay === day 
                            ? 'bg-background shadow-sm text-primary' 
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Meals for Day */}
                  <div className="flex-1 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <CalendarRange className="w-5 h-5 text-primary" /> {selectedDay}'s Menu
                    </h3>
                    
                    <div className="space-y-6">
                      {parsedPlanData[selectedDay] ? Object.entries(parsedPlanData[selectedDay]).map(([mealType, details]: [string, any]) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={mealType} 
                          className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-primary/20"
                        >
                          <div className="absolute left-[-5px] top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">{mealType}</h4>
                          <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                            <p className="font-medium text-lg leading-snug">{typeof details === 'string' ? details : details.name || JSON.stringify(details)}</p>
                            {typeof details !== 'string' && details.calories && (
                              <p className="text-sm text-primary mt-2 font-semibold">~{details.calories} kcal</p>
                            )}
                          </div>
                        </motion.div>
                      )) : (
                        <p className="text-muted-foreground">No specific meals defined for this format.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Plan data format is unsupported or loading.</p>
                </div>
              )}
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
