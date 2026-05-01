import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard, UserCircle, Utensils,
  Search, Target, MessageSquare, LogOut,
  Menu, X, Leaf, Timer, Trophy, Calculator,
  Mic, Shield, Globe, Sun, Moon
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "nav.tracker", icon: Target },
  { href: "/diet-plan", label: "nav.dietPlan", icon: Utensils },
  { href: "/food-checker", label: "nav.foodChecker", icon: Search },
  { href: "/bmi-calculator", label: "BMI & BMR", icon: Calculator, raw: true },
  { href: "/disease-diet", label: "Disease Diet", icon: Shield, raw: true },
  { href: "/fasting", label: "nav.fasting", icon: Timer },
  { href: "/voice-agent", label: "Voice Coach", icon: Mic, raw: true },
  { href: "/chat", label: "nav.chat", icon: MessageSquare },
  { href: "/achievements", label: "nav.achievements", icon: Trophy },
  { href: "/profile", label: "nav.profile", icon: UserCircle },
];

const LANGS = [
  { code: "en", label: "EN", name: "English" },
  { code: "hi", label: "हि", name: "हिन्दी" },
  { code: "es", label: "ES", name: "Español" },
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
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary/20">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b z-20 relative">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
          <Leaf className="w-6 h-6" /> NutriAI
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-foreground">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isMobileMenuOpen || (typeof window !== "undefined" && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={cn(
              "fixed md:static inset-y-0 left-0 w-64 bg-card border-r shadow-xl md:shadow-none z-30 flex flex-col",
              !isMobileMenuOpen && "hidden md:flex"
            )}
          >
            {/* Logo */}
            <div className="p-6 hidden md:flex items-center gap-3 text-primary font-display font-bold text-2xl tracking-tight">
              <div className="bg-primary/10 p-2 rounded-xl text-primary"><Leaf className="w-6 h-6" /></div>
              NutriAI
            </div>

            {/* User Card */}
            <div className="px-4 pb-3">
              <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const label = item.raw ? item.label : t(item.label);
                const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Language + Theme + Sign out */}
            <div className="p-4 border-t space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {LANGS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => changeLang(lang.code)}
                    title={lang.name}
                    className={cn("text-xs px-2 py-1 rounded-lg font-medium transition-colors", currentLang === lang.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
                  >
                    {lang.label}
                  </button>
                ))}

                {/* Dark/Light toggle */}
                <button
                  onClick={toggleTheme}
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <motion.div
                    key={isDark ? "moon" : "sun"}
                    initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </motion.div>
                </button>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => signOut({ redirectUrl: `${import.meta.env.BASE_URL}sign-in` })}
              >
                <LogOut className="w-4 h-4 mr-3" /> {t("nav.signOut")}
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10 pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}
