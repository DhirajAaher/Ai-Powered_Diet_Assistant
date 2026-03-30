import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-direct";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Play, Square, Clock, Utensils, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const MODES = [
  { id: "16:8", label: "16:8", desc: "Fast 16h, eat in 8h window", fastHours: 16, eatHours: 8 },
  { id: "18:6", label: "18:6", desc: "Fast 18h, eat in 6h window", fastHours: 18, eatHours: 6 },
  { id: "OMAD", label: "OMAD", desc: "One Meal A Day (23:1)", fastHours: 23, eatHours: 1 },
];

function formatDuration(ms: number) {
  if (ms < 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Fasting() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedMode, setSelectedMode] = useState("16:8");
  const [tick, setTick] = useState(0);

  const { data: session } = useQuery({ queryKey: ["fasting-active"], queryFn: () => api.get<any>("/api/fasting/active") });
  const { data: history } = useQuery({ queryKey: ["fasting-history"], queryFn: () => api.get<any[]>("/api/fasting/history") });

  const start = useMutation({ mutationFn: () => api.post("/api/fasting/start", { mode: selectedMode }), onSuccess: () => qc.invalidateQueries({ queryKey: ["fasting-active"] }) });
  const stop = useMutation({ mutationFn: () => api.post("/api/fasting/stop", {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ["fasting-active"] }); qc.invalidateQueries({ queryKey: ["fasting-history"] }); } });

  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const modeInfo = MODES.find(m => m.id === (session?.mode ?? selectedMode)) ?? MODES[0];
  const elapsedMs = session ? Date.now() - new Date(session.startTime).getTime() : 0;
  const targetMs = modeInfo.fastHours * 3600000;
  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const progress = session ? Math.min(100, (elapsedMs / targetMs) * 100) : 0;
  const eatingStart = session ? new Date(new Date(session.startTime).getTime() + targetMs) : null;
  const eatingEnd = eatingStart ? new Date(eatingStart.getTime() + modeInfo.eatHours * 3600000) : null;

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("fasting.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("fasting.subtitle")}</p>
      </div>

      {/* Mode Selector */}
      {!session && (
        <div className="grid grid-cols-3 gap-4">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${selectedMode === mode.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-2xl font-black mb-1">{mode.label}</div>
              <div className="text-sm text-muted-foreground">{mode.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Timer */}
      <Card className={`border-0 shadow-xl overflow-hidden ${session ? "shadow-primary/10" : ""}`}>
        <div className={`h-1.5 bg-secondary`}>
          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <CardContent className="p-8 flex flex-col items-center gap-6">
          {session && (
            <Badge variant="secondary" className="text-primary font-semibold px-4 py-1.5 text-sm">
              <Timer className="w-4 h-4 mr-2" />
              {t("fasting.active")} — {session.mode}
            </Badge>
          )}
          <div className="text-center">
            <div className="text-7xl font-display font-black tabular-nums tracking-tighter">
              {session ? formatDuration(elapsedMs) : "00:00:00"}
            </div>
            <div className="text-muted-foreground mt-2 text-sm">{session ? `${t("fasting.remaining")}: ${formatDuration(remainingMs)}` : "Ready to start"}</div>
          </div>

          {session && (
            <div className="w-full max-w-sm">
              <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>0h</span><span>{modeInfo.fastHours}h</span>
              </div>
            </div>
          )}

          {eatingStart && eatingEnd && (
            <div className="flex items-center gap-3 text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-5 py-3 rounded-xl">
              <Utensils className="w-4 h-4 flex-shrink-0" />
              <span>{t("fasting.eating")}: {format(eatingStart, "h:mm a")} – {format(eatingEnd, "h:mm a")}</span>
            </div>
          )}

          {session ? (
            <Button onClick={() => stop.mutate()} variant="destructive" size="lg" className="px-10 rounded-full" disabled={stop.isPending}>
              <Square className="w-5 h-5 mr-2 fill-current" />
              {t("fasting.stop")}
            </Button>
          ) : (
            <Button onClick={() => start.mutate()} size="lg" className="px-10 rounded-full shadow-lg" disabled={start.isPending}>
              <Play className="w-5 h-5 mr-2 fill-current" />
              {t("fasting.start")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history && history.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />{t("fasting.history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice().reverse().slice(0, 5).map((s: any) => {
                const dur = s.endTime ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime() : null;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{s.mode}</Badge>
                      <span className="text-sm text-muted-foreground">{format(new Date(s.startTime), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dur && <span className="text-sm font-medium">{formatDuration(dur)}</span>}
                      <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-xs">{s.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
