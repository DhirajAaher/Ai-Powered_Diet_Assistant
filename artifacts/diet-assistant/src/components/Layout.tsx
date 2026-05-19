import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard, UserCircle, Utensils,
  Search, Target, MessageSquare, LogOut,
  Menu, X, Timer, Trophy, Calculator,
  Mic, Shield, Globe, Sun, Moon, ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const NAV_GROUPS = [
  {
    label: "nav.overview",
    items: [
      { href: "/dashboard",     label: "nav.dashboard",      icon: LayoutDashboard, color: "text-violet-500" },
      { href: "/tracker",       label: "nav.tracker",        icon: Target,          color: "text-blue-500" },
    ],
  },
  {
    label: "nav.nutrition",
    items: [
      { href: "/diet-plan",     label: "nav.dietPlan",       icon: Utensils,        color: "text-green-500" },
      { href: "/food-checker",  label: "nav.foodChecker",    icon: Search,          color: "text-orange-500" },
      { href: "/disease-diet",  label: "nav.diseaseDiet",    icon: Shield,          color: "text-red-500" },
    ],
  },
  {
    label: "nav.health",
    items: [
      { href: "/bmi-calculator", label: "nav.bmi",            icon: Calculator,      color: "text-cyan-500" },
      { href: "/fasting",       label: "nav.fasting",        icon: Timer,           color: "text-amber-500" },
    ],
  },
  {
    label: "nav.tools",
    items: [
      { href: "/voice-agent",   label: "nav.voiceCoach",     icon: Mic,             color: "text-pink-500" },
      { href: "/chat",          label: "nav.chat",           icon: MessageSquare,   color: "text-indigo-500" },
      { href: "/achievements",  label: "nav.achievements",   icon: Trophy,          color: "text-yellow-500" },
      { href: "/profile",       label: "nav.profile",        icon: UserCircle,      color: "text-slate-400" },
    ],
  },
];

const LANGS = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "es", label: "ES" },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(localStorage.getItem("nutriai_lang") || "en");

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("nutriai_lang", code);
    setCurrentLang(code);
  }

  const displayName = user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  const Sidebar = () => (
    <aside className={cn(
      "fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col h-screen overflow-hidden",
      "glass-sidebar transition-all duration-300"
    )}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-indigo-500 to-accent flex items-center justify-center shadow-xl shadow-primary/30 flex-shrink-0 animate-float">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-lg text-foreground leading-tight">Diet AI</span>
          <span className="block text-[10px] text-muted-foreground font-medium -mt-0.5 whitespace-nowrap">AI-Powered Assistant</span>
        </div>
      </div>

      {/* User Card */}
      <div className="px-3 mb-3 flex-shrink-0">
        <div className={cn(
          "flex items-center gap-2.5 p-2.5 rounded-xl",
          isDark ? "bg-slate-800/60" : "bg-slate-50"
        )}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-bold text-white text-sm font-display flex-shrink-0 shadow-lg glow-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-2 mb-1.5">
              {t(group.label)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                      isActive
                        ? "sidebar-link-active"
                        : isDark ? "text-slate-400 hover:text-slate-100 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5"
                    )}>
                      <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? "text-white" : item.color + " opacity-80 group-hover:opacity-100")} />
                      <span className="text-sm font-semibold">{t(item.label)}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-80" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("px-3 pt-3 pb-4 border-t flex-shrink-0", isDark ? "border-slate-800" : "border-slate-100")}>
        {/* Language + theme row */}
        <div className="flex items-center gap-1 mb-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-0.5 flex-1">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                className={cn(
                  "text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all duration-200",
                  currentLang === lang.code
                    ? "bg-primary text-primary-foreground shadow-md glow-primary scale-105"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? "Light mode" : "Dark mode"}
            className={cn(
              "p-1.5 rounded-lg transition-colors flex-shrink-0",
              isDark ? "text-amber-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isDark ? "sun" : "moon"}
                initial={{ rotate: -30, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 30, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* Sign out */}
        <button
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150",
            isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-950/40" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
          )}
          onClick={() => signOut({ redirectUrl: `${import.meta.env.BASE_URL}sign-in` })}
        >
          <LogOut className="w-4 h-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );

  return (
    <div className={cn("min-h-screen flex font-sans selection:bg-primary/30", isDark ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900")}>
      <div className="mesh-bg" />
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14",
        isDark ? "bg-slate-900/95 border-b border-slate-800" : "bg-white/95 border-b border-slate-100",
        "backdrop-blur-md"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg shadow-primary/30 animate-float">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-base text-foreground">Diet AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={cn("p-2 rounded-lg transition-colors", isDark ? "text-amber-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-30 md:hidden"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="max-w-6xl mx-auto p-4 md:p-8 pb-12">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="page-transition-wrapper"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
