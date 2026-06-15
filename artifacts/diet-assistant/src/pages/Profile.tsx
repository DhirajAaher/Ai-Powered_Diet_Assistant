import { useState, useEffect, useRef } from "react";
import { useGetProfile, useCreateOrUpdateProfile, UserProfileBody } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, Target, UserCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { toast } = useToast();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const headers = { request: { headers: getAuthHeaders() } };
  
  const { data: profile, isLoading } = useGetProfile({
    ...headers,
    query: { retry: false } // Avoid endless retries if 404 (no profile yet)
  });
  
  const updateProfile = useCreateOrUpdateProfile(headers);

  const [formData, setFormData] = useState<Partial<UserProfileBody>>({
    age: 30,
    gender: "male",
    heightCm: 175,
    weightKg: 70,
    activityLevel: "moderately_active",
    dietPreference: "non_vegetarian",
    goal: "maintenance"
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age,
        gender: profile.gender,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        dietPreference: profile.dietPreference,
        goal: profile.goal
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { data: formData as UserProfileBody },
      {
        onSuccess: () => {
          toast({ title: "Profile updated", description: "Your physical profile has been saved." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to save profile." });
        }
      }
    );
  };

  const handleChange = (field: keyof UserProfileBody, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await user?.setProfileImage({ file });
      toast({ title: "Profile picture updated!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.errors?.[0]?.message || "Something went wrong" });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-2xl"></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative group cursor-pointer" onClick={handleImageClick}>
          {user?.hasImage ? (
            <img src={user.imageUrl} alt="Profile" className={`w-16 h-16 rounded-2xl object-cover shadow-lg ${isUploading ? 'opacity-50' : ''}`} />
          ) : (
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg ${isUploading ? 'opacity-50' : ''}`}>
              <UserCircle className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-semibold text-center leading-tight">Change<br/>Photo</span>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">My Profile</h1>
          <p className="text-muted-foreground">Set your physical details to personalize your AI diet plan.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
          <CardHeader>
            <CardTitle>Physical Details</CardTitle>
            <CardDescription>Basic metrics for calorie calculations</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Age</Label>
              <Input 
                type="number" 
                value={formData.age} 
                onChange={e => handleChange('age', parseInt(e.target.value))} 
                min={1} max={120} required 
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <select 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input 
                type="number" 
                value={formData.heightCm} 
                onChange={e => handleChange('heightCm', parseInt(e.target.value))} 
                min={50} max={300} required 
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input 
                type="number" 
                value={formData.weightKg} 
                onChange={e => handleChange('weightKg', parseInt(e.target.value))} 
                min={10} max={500} required 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-black/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/> Lifestyle & Goals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <Label>Activity Level</Label>
              <select 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={formData.activityLevel}
                onChange={e => handleChange('activityLevel', e.target.value)}
              >
                <option value="sedentary">Sedentary (Little or no exercise)</option>
                <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                <option value="very_active">Very Active (6-7 days/week)</option>
                <option value="extra_active">Extra Active (Very hard exercise/job)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Diet Preference</Label>
              <select 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={formData.dietPreference}
                onChange={e => handleChange('dietPreference', e.target.value)}
              >
                <option value="non_vegetarian">Non-Vegetarian (Anything)</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="paleo">Paleo</option>
                <option value="mediterranean">Mediterranean</option>
                <option value="gluten_free">Gluten Free</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2"><Target className="w-4 h-4" /> Primary Goal</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {[
                  { id: 'weight_loss', label: 'Weight Loss' },
                  { id: 'muscle_gain', label: 'Muscle Gain' },
                  { id: 'maintenance', label: 'Maintenance' },
                  { id: 'improve_health', label: 'Improve Health' },
                ].map(goal => (
                  <div 
                    key={goal.id}
                    onClick={() => handleChange('goal', goal.id)}
                    className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${
                      formData.goal === goal.id 
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-inner' 
                        : 'hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <span className="text-sm">{goal.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={updateProfile.isPending} className="px-8 shadow-xl shadow-primary/25">
            {updateProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
