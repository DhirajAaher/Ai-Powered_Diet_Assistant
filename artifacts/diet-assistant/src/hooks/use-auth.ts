import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  useGetMe, 
  useLoginUser, 
  useRegisterUser, 
  useLogoutUser,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { getAuthHeaders, setAuthToken, clearAuthToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    request: { headers: getAuthHeaders() },
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  const login = useLoginUser({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Login Failed", 
          description: err.error || "Invalid credentials." 
        });
      }
    }
  });

  const register = useRegisterUser({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        toast({ title: "Account created!", description: "Welcome to AI Diet Assistant." });
        setLocation("/profile"); // Direct to profile setup
      },
      onError: (err: any) => {
        toast({ 
          variant: "destructive", 
          title: "Registration Failed", 
          description: err.error || "Could not create account." 
        });
      }
    }
  });

  const logout = useLogoutUser({
    mutation: {
      onSettled: () => {
        clearAuthToken();
        queryClient.clear();
        setLocation("/login");
      }
    }
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isUserLoading,
    login: login.mutate,
    isLoggingIn: login.isPending,
    register: register.mutate,
    isRegistering: register.isPending,
    logout: logout.mutate,
  };
}
