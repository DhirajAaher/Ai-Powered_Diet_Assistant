import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { register, isRegistering } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ data: { name, email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 glass-card rounded-3xl relative z-10 mx-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary mb-4 ring-1 ring-primary/20">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Join NutriAI</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Start your journey to a healthier lifestyle today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe" 
              required
              className="bg-white/50 dark:bg-black/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" 
              required
              className="bg-white/50 dark:bg-black/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required 
              minLength={6}
              className="bg-white/50 dark:bg-black/50"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold mt-4"
            disabled={isRegistering}
          >
            {isRegistering ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground border-t border-border/50 pt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
