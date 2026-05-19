import { useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "@/lib/i18n";

import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";

const Dashboard    = lazy(() => import("@/pages/Dashboard"));
const Profile      = lazy(() => import("@/pages/Profile"));
const DietPlan     = lazy(() => import("@/pages/DietPlan"));
const Tracker      = lazy(() => import("@/pages/Tracker"));
const FoodChecker  = lazy(() => import("@/pages/FoodChecker"));
const Chat         = lazy(() => import("@/pages/Chat"));
const BmiCalculator = lazy(() => import("@/pages/BmiCalculator"));
const VoiceAgent   = lazy(() => import("@/pages/VoiceAgent"));
const DiseaseDiet  = lazy(() => import("@/pages/DiseaseDiet"));
const Fasting      = lazy(() => import("@/pages/Fasting"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const NotFound     = lazy(() => import("@/pages/not-found"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

function buildClerkAppearance(dark: boolean) {
  const baseEl = {
    rootBox: "w-full",
    cardBox: cn(
      "rounded-2xl w-full overflow-hidden",
      dark ? "bg-slate-900/95 shadow-2xl shadow-black/60 border border-slate-700/50" : "bg-white/95 shadow-2xl shadow-black/12 border border-slate-200/80"
    ),
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent",
    headerTitle: cn("font-bold text-2xl", dark ? "text-white" : "text-slate-900"),
    headerSubtitle: cn(dark ? "text-slate-400" : "text-slate-500"),
    socialButtonsBlockButtonText: cn("font-medium", dark ? "text-slate-200" : "text-slate-700"),
    formFieldLabel: cn("font-semibold text-sm", dark ? "text-slate-300" : "text-slate-700"),
    footerActionLink: cn("font-semibold", dark ? "text-green-400 hover:text-green-300" : "text-green-600 hover:text-green-700"),
    footerActionText: cn(dark ? "text-slate-400" : "text-slate-500"),
    dividerText: cn("text-sm", dark ? "text-slate-500" : "text-slate-400"),
    identityPreviewEditButton: cn(dark ? "text-green-400" : "text-green-600"),
    formFieldSuccessText: cn(dark ? "text-green-400" : "text-green-600"),
    alertText: cn(dark ? "text-slate-300" : "text-slate-700"),
    logoBox: "mb-2",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: cn(
      "transition-all duration-200",
      dark ? "border-slate-700 hover:bg-slate-800 hover:border-slate-600" : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
    ),
    formButtonPrimary: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg shadow-green-500/25 transition-all duration-200 hover:shadow-green-500/40 hover:-translate-y-px",
    formFieldInput: cn(
      "transition-all duration-200",
      dark ? "border-slate-600 bg-slate-800/80 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20" : "border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-green-500/20"
    ),
    footerAction: "pb-2",
    dividerLine: cn(dark ? "bg-slate-700" : "bg-slate-200"),
    alert: cn(dark ? "border-red-800/60 bg-red-950/60" : "border-red-200 bg-red-50"),
    otpCodeFieldInput: cn(dark ? "border-slate-600 bg-slate-800" : "border-slate-200"),
    formFieldRow: "gap-3",
    main: "gap-5",
    badge: "hidden",
    internal: "hidden",
  };
  return {
    theme: shadcn,
    cssLayerName: "clerk",
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
      socialButtonsPlacement: "top" as const,
      socialButtonsVariant: "blockButton" as const,
    },
    variables: dark ? {
      colorPrimary: "#22c55e",
      colorForeground: "#e2e8f0",
      colorMutedForeground: "#94a3b8",
      colorDanger: "#f87171",
      colorBackground: "#0f172a",
      colorInput: "#1e293b",
      colorInputForeground: "#e2e8f0",
      colorNeutral: "#334155",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.875rem",
    } : {
      colorPrimary: "#22c55e",
      colorForeground: "#0f172a",
      colorMutedForeground: "#64748b",
      colorDanger: "#ef4444",
      colorBackground: "#ffffff",
      colorInput: "#f8fafc",
      colorInputForeground: "#0f172a",
      colorNeutral: "#e2e8f0",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.875rem",
    },
    elements: baseEl,
  };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function DevBadgeRemover() {
  useEffect(() => {
    const remove = () => {
      // Target Clerk dev badge by text content & known selectors
      document.querySelectorAll<HTMLElement>(
        ".cl-badge, [data-localization-key*='badge'], [class*='cl-badge']"
      ).forEach(el => { el.style.display = "none"; });
      // Also find by text
      document.querySelectorAll<HTMLElement>("a, span, div, p").forEach(el => {
        if (el.textContent?.trim() === "Development mode") el.style.display = "none";
      });
    };
    remove();
    const obs = new MutationObserver(remove);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}

const FEATURES = [
  { icon: "🥗", title: "AI Meal Planning", desc: "7-day personalized plans by GPT" },
  { icon: "📊", title: "Macro Tracking", desc: "Calories, protein, carbs & fat" },
  { icon: "💧", title: "Hydration Coach", desc: "Daily water goals & reminders" },
  { icon: "🏋️", title: "BMI & BMR", desc: "Know your body numbers" },
  { icon: "🩺", title: "Disease Diets", desc: "Diabetes, PCOS, hypertension" },
  { icon: "🎯", title: "Fasting Timer", desc: "16:8, 18:6 & OMAD protocols" },
];

const FLOAT_ITEMS = ["🥑", "🍎", "🥦", "🍇", "🥕", "🫐", "🍋", "🥝", "🌿", "🍓"];

function FloatingItem({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute text-2xl select-none pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -18, 0], rotate: [0, 8, -8, 0], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      {emoji}
    </motion.div>
  );
}

function AuthHeroPanel({ mode }: { mode: "signin" | "signup" }) {
  return (
    <div className="flex flex-col justify-between p-10 xl:p-14 relative overflow-hidden h-full">
      {/* Animated gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500" />
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      {/* Floating food emojis */}
      {FLOAT_ITEMS.map((emoji, i) => (
        <FloatingItem
          key={i} emoji={emoji} delay={i * 0.4}
          x={5 + (i * 9) % 85} y={8 + (i * 13) % 75}
        />
      ))}

      {/* Brand */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shadow-lg">🌿</div>
          <span className="text-white font-display font-bold text-3xl tracking-tight drop-shadow">AI-Powered Diet Assistant</span>
        </div>
        <p className="text-white/75 text-sm font-medium">Your AI-powered wellness companion</p>
      </motion.div>

      {/* Features */}
      <motion.div
        className="relative z-10 space-y-3"
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
      >
        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
          {mode === "signin" ? "Everything you need" : "What you'll get"}
        </p>
        <div className="grid grid-cols-1 gap-2.5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/15"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            >
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs">{f.desc}</p>
              </div>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300 flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Security badge */}
      <motion.div
        className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/15"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}
      >
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-white font-semibold text-xs">Bank-grade security</p>
          <p className="text-white/60 text-xs">256-bit encryption · GDPR compliant · 2FA ready</p>
        </div>
      </motion.div>
    </div>
  );
}

function SecurityHints({ mode }: { mode: "signin" | "signup" }) {
  if (mode !== "signup") return null;
  return (
    <motion.div
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 p-3"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
    >
      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
        <span>🛡️</span> Strong Password Tips
      </p>
      <ul className="space-y-1 text-xs text-amber-700/80 dark:text-amber-400/70">
        <li className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> At least 8 characters</li>
        <li className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Mix uppercase & lowercase letters</li>
        <li className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Include numbers &amp; symbols (!@#$)</li>
        <li className="flex items-center gap-1.5"><span className="text-amber-500">✓</span> Avoid common words or birthdates</li>
      </ul>
    </motion.div>
  );
}

function AuthPageLayout({ children, mode }: { children: React.ReactNode; mode: "signin" | "signup" }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <div className={cn(
      "min-h-[100dvh] flex items-stretch transition-colors duration-300",
      isDark ? "bg-slate-950" : "bg-slate-50"
    )}>
      {/* Left hero panel — only visible on large screens */}
      <div className="hidden lg:block lg:w-[45%] flex-shrink-0 min-h-[100dvh]">
        <AuthHeroPanel mode={mode} />
      </div>

      {/* Right form panel — full width on small screens */}
      <div className={cn(
        "flex-1 flex flex-col items-center justify-center p-6 lg:p-12 min-h-[100dvh] relative",
        isDark ? "bg-slate-950" : "bg-white"
      )}>
        {/* Subtle mesh bg */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{ backgroundImage: isDark
            ? "radial-gradient(ellipse at 70% 20%, rgba(34,197,94,0.08) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 70% 20%, rgba(34,197,94,0.06) 0%, transparent 60%)"
          }} />

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          {/* Mobile-only branding */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-xl shadow-lg shadow-green-500/30">🌿</div>
            <span className="font-display font-bold text-2xl text-foreground">AI-Powered Diet Assistant</span>
          </div>

          {children}

          <SecurityHints mode={mode} />

          <p className="text-center text-xs text-muted-foreground mt-5">
            By continuing, you agree to our{" "}
            <span className="underline cursor-pointer hover:text-foreground transition-colors">Terms</span> &amp;{" "}
            <span className="underline cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageLayout mode="signin">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageLayout>
  );
}

function SignUpPage() {
  return (
    <AuthPageLayout mode="signup">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPageLayout>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </Layout>
      </Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  return (
    <Switch>
      <Route path="/">
        <Show when="signed-in"><Redirect to="/dashboard" /></Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>

      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/login" component={() => { setLocation("/sign-in"); return null; }} />

      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>
      <Route path="/tracker">
        <ProtectedRoute><Tracker /></ProtectedRoute>
      </Route>
      <Route path="/diet-plan">
        <ProtectedRoute><DietPlan /></ProtectedRoute>
      </Route>
      <Route path="/food-checker">
        <ProtectedRoute><FoodChecker /></ProtectedRoute>
      </Route>
      <Route path="/chat">
        <ProtectedRoute><Chat /></ProtectedRoute>
      </Route>
      <Route path="/bmi-calculator">
        <ProtectedRoute><BmiCalculator /></ProtectedRoute>
      </Route>
      <Route path="/voice-agent">
        <ProtectedRoute><VoiceAgent /></ProtectedRoute>
      </Route>
      <Route path="/disease-diet">
        <ProtectedRoute><DiseaseDiet /></ProtectedRoute>
      </Route>
      <Route path="/fasting">
        <ProtectedRoute><Fasting /></ProtectedRoute>
      </Route>
      <Route path="/achievements">
        <ProtectedRoute><Achievements /></ProtectedRoute>
      </Route>

      <Route><Suspense fallback={<PageLoader />}><NotFound /></Suspense></Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { resolvedTheme } = useTheme();
  const appearance = buildClerkAppearance(resolvedTheme === "dark");
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back 👋", subtitle: "Sign in to continue your health journey" } },
        signUp: { start: { title: "Start your journey 🌿", subtitle: "Create your free AI Diet Assistant account today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <DevBadgeRemover />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
