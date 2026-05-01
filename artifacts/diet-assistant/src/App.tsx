import { useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import "@/lib/i18n";

import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const DietPlan = lazy(() => import("@/pages/DietPlan"));
const Tracker = lazy(() => import("@/pages/Tracker"));
const FoodChecker = lazy(() => import("@/pages/FoodChecker"));
const Chat = lazy(() => import("@/pages/Chat"));
const BmiCalculator = lazy(() => import("@/pages/BmiCalculator"));
const VoiceAgent = lazy(() => import("@/pages/VoiceAgent"));
const DiseaseDiet = lazy(() => import("@/pages/DiseaseDiet"));
const Fasting = lazy(() => import("@/pages/Fasting"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const NotFound = lazy(() => import("@/pages/not-found"));

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
      colorBackground: "#0f1a12",
      colorInput: "#1a2e1e",
      colorInputForeground: "#e2e8f0",
      colorNeutral: "#334155",
      fontFamily: "'Inter', sans-serif",
      borderRadius: "0.75rem",
    } : {
      colorPrimary: "#22c55e",
      colorForeground: "#0f172a",
      colorMutedForeground: "#64748b",
      colorDanger: "#ef4444",
      colorBackground: "#ffffff",
      colorInput: "#f8fafc",
      colorInputForeground: "#0f172a",
      colorNeutral: "#e2e8f0",
      fontFamily: "'Inter', sans-serif",
      borderRadius: "0.75rem",
    },
    elements: dark ? {
      rootBox: "w-full flex justify-center",
      cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/40",
      card: "!shadow-none !border-0 !bg-transparent !rounded-none",
      footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
      headerTitle: "text-slate-100 font-bold text-2xl",
      headerSubtitle: "text-slate-400",
      socialButtonsBlockButtonText: "text-slate-200 font-medium",
      formFieldLabel: "text-slate-300 font-medium text-sm",
      footerActionLink: "text-green-400 hover:text-green-300 font-medium",
      footerActionText: "text-slate-400",
      dividerText: "text-slate-500 text-sm",
      identityPreviewEditButton: "text-green-400",
      formFieldSuccessText: "text-green-400",
      alertText: "text-slate-300",
      logoBox: "mb-1",
      logoImage: "h-12 w-12",
      socialButtonsBlockButton: "border-slate-700 hover:bg-slate-800 transition-colors",
      formButtonPrimary: "bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors",
      formFieldInput: "border-slate-700 bg-slate-800 text-slate-100 focus:ring-green-500",
      footerAction: "pb-2",
      dividerLine: "bg-slate-700",
      alert: "border-red-900 bg-red-950",
      otpCodeFieldInput: "border-slate-700",
      formFieldRow: "gap-3",
      main: "gap-5",
    } : {
      rootBox: "w-full flex justify-center",
      cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/10",
      card: "!shadow-none !border-0 !bg-transparent !rounded-none",
      footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
      headerTitle: "text-slate-900 font-bold text-2xl",
      headerSubtitle: "text-slate-500",
      socialButtonsBlockButtonText: "text-slate-700 font-medium",
      formFieldLabel: "text-slate-700 font-medium text-sm",
      footerActionLink: "text-green-600 hover:text-green-700 font-medium",
      footerActionText: "text-slate-500",
      dividerText: "text-slate-400 text-sm",
      identityPreviewEditButton: "text-green-600",
      formFieldSuccessText: "text-green-600",
      alertText: "text-slate-700",
      logoBox: "mb-1",
      logoImage: "h-12 w-12",
      socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50 transition-colors",
      formButtonPrimary: "bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors",
      formFieldInput: "border-slate-200 bg-slate-50 text-slate-900 focus:ring-green-500",
      footerAction: "pb-2",
      dividerLine: "bg-slate-200",
      alert: "border-red-200 bg-red-50",
      otpCodeFieldInput: "border-slate-200",
      formFieldRow: "gap-3",
      main: "gap-5",
    },
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

function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <div className={cn(
      "flex min-h-[100dvh] items-center justify-center px-4 transition-colors duration-300",
      isDark
        ? "bg-gradient-to-br from-green-950 via-slate-900 to-emerald-950"
        : "bg-gradient-to-br from-green-50 via-white to-emerald-50"
    )}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, ${isDark ? '#16a34a33' : '#22c55e22'} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${isDark ? '#0d946633' : '#10b98122'} 0%, transparent 50%)`
      }} />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageWrapper>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthPageWrapper>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthPageWrapper>
  );
}

function PageLoader() {
  return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
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
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/profile">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Profile /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/tracker">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Tracker /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/diet-plan">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><DietPlan /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/food-checker">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><FoodChecker /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/chat">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Chat /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/bmi-calculator">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><BmiCalculator /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/voice-agent">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><VoiceAgent /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/disease-diet">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><DiseaseDiet /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/fasting">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Fasting /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      </Route>
      <Route path="/achievements">
        <Show when="signed-in">
          <Layout><Suspense fallback={<PageLoader />}><Achievements /></Suspense></Layout>
        </Show>
        <Show when="signed-out"><Redirect to="/sign-in" /></Show>
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
        signIn: { start: { title: "Welcome Back to NutriAI", subtitle: "Sign in to your personalized AI diet assistant" } },
        signUp: { start: { title: "Join NutriAI", subtitle: "Start your journey to a healthier lifestyle today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
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
