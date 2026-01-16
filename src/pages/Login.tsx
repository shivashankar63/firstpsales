import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, TrendingUp, Mail, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signUpWithEmail, supabase, updateUser } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UserRole = "owner" | "manager" | "salesman";

const normalizeRole = (value: unknown): UserRole | null => {
  const role = String(value ?? "").toLowerCase().trim();
  if (role === "owner" || role === "manager" || role === "salesman") {
    return role;
  }
  return null;
};

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Always clear any existing session before logging in
      await supabase.auth.signOut();

      // Authenticate user
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        const loggedInEmail = data.user.email?.toLowerCase();
        if (loggedInEmail && loggedInEmail !== email.toLowerCase()) {
          await supabase.auth.signOut();
          setError("Login mismatch. Please try again.");
          setLoading(false);
          return;
        }
        // Get user role from DB
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (userError || !userData) {
          setError("User role not found.");
          setLoading(false);
          return;
        }
        // Normalize role from DB and auth metadata
        const dbRole = normalizeRole(userData.role);
        const metaRole = normalizeRole(
          data.user.user_metadata?.role ?? data.user.app_metadata?.role
        );
        // Prefer DB role as source of truth, fall back to metadata only if DB missing
        const resolvedRole = dbRole ?? metaRole;

        // If DB role is missing but metadata exists, sync it to DB
        if (!dbRole && metaRole) {
          await updateUser(data.user.id, { role: metaRole });
        }

        // Navigate based on resolved role
        if (resolvedRole === "salesman") {
          navigate("/salesman", { replace: true });
          return;
        } else if (resolvedRole === "manager") {
          navigate("/manager", { replace: true });
          return;
        } else if (resolvedRole === "owner") {
          navigate("/owner", { replace: true });
          return;
        } else {
          setError("Access denied. Invalid user role.");
          setLoading(false);
        }
      }
    } catch (err) {
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1"
              />
            </div>
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    );
  };



export default Login;
