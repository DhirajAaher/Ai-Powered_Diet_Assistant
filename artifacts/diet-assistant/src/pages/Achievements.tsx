import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api-direct";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Achievements() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["gamification"], queryFn: () => api.get<any>("/api/gamification") });

  if (isLoading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 bg-muted rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="h-40 bg-muted rounded-2xl" />)}</div>
    </div>
  );

  const { points = 0, level = 1, streakDays = 0, badges = [], nextBadges = [], allBadges = [], nextLevelPoints = 50, prevLevelPoints = 0 } = data ?? {};
  const progressToNext = nextLevelPoints > prevLevelPoints ? Math.round(((points - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100) : 100;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("achievements.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("achievements.subtitle")}</p>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: "⭐", label: t("achievements.level"), value: level, color: "from-yellow-500/10 to-orange-500/10 border-yellow-200" },
          { icon: "💎", label: t("achievements.points"), value: `${points}`, color: "from-blue-500/10 to-purple-500/10 border-blue-200" },
          { icon: "🔥", label: t("achievements.streak"), value: `${streakDays}d`, color: "from-orange-500/10 to-red-500/10 border-orange-200" },
        ].map(stat => (
          <Card key={stat.label} className={`border bg-gradient-to-br ${stat.color} shadow-sm`}>
            <CardContent className="p-5 text-center">
              <div className="text-3xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black">{stat.value}</div>
              <div className="text-xs text-muted-foreground capitalize">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Level Progress */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" />Level {level}</CardTitle>
          <CardDescription>{points} / {nextLevelPoints} {t("achievements.points")} to Level {level + 1}</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressToNext} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">{nextLevelPoints - points} more points needed</p>
        </CardContent>
      </Card>

      {/* Earned Badges */}
      {badges.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />{t("achievements.earnedBadges")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((badge: any) => (
              <motion.div key={badge.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.03 }}>
                <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className="text-4xl mb-3">{badge.icon}</div>
                    <div className="font-bold text-sm">{badge.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{badge.desc}</div>
                    <Badge className="mt-3 text-xs" variant="secondary">+{badge.points} pts</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Next Badges */}
      {nextBadges.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" />{t("achievements.nextBadges")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nextBadges.map((badge: any) => (
              <Card key={badge.id} className="border-0 shadow-sm opacity-60">
                <CardContent className="p-5 text-center">
                  <div className="text-4xl mb-3 grayscale">{badge.icon}</div>
                  <div className="font-bold text-sm">{badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{badge.desc}</div>
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">+{badge.points} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {badges.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent shadow-none text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold mb-2">Start Earning Badges!</h2>
          <p className="text-muted-foreground">Log meals, track water, and complete fasts to earn your first badge.</p>
        </Card>
      )}
    </div>
  );
}
