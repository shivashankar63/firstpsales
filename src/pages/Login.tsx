import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, TrendingUp, Mail, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signUpWithEmail, supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UserRole = "owner" | "manager" | "salesman";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("salesman");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch user role and redirect
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (data) {
          const dashboardRoute = {
            owner: '/owner',
            manager: '/manager',
            salesman: '/salesman',
          };
          navigate(dashboardRoute[data.role as UserRole]);
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up logic
        const { data, error: signUpError } = await signUpWithEmail(email, password, fullName, selectedRole);
        
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Create user profile in database
          const { error: profileError } = await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email,
              full_name: fullName,
              role: selectedRole,
            }]);

          if (profileError) {
            setError(profileError.message);
            setLoading(false);
            return;
          }

          setSuccessMessage("Account created successfully! Please log in now.");
          setIsSignUp(false);
          setEmail("");
          setPassword("");
          setFullName("");
        }
      } else {
        // Login logic
        const { data, error: loginError } = await signInWithEmail(email, password);
        
        if (loginError) {
          setError(loginError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Fetch user role
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (userData) {
            const dashboardRoute = {
              owner: '/owner',
              manager: '/manager',
              salesman: '/salesman',
            };
            navigate(dashboardRoute[userData.role as UserRole]);
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12 relative overflow-hidden"
      >
        <div className="relative z-20">
          <div className="flex items-center gap-3 mb-24">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-2xl font-bold">SalesFlow</span>
          </div>
        </div>

        <div className="relative z-20">
          <h1 className="text-4xl font-bold text-white mb-6">
            Your Sales,
            <br />
            Elevated.
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Manage leads, track performance, and drive sales growth with our intuitive platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Real-time analytics & insights</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Team collaboration tools</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Automated lead management</span>
            </div>
          </div>
        </div>

        <div className="relative z-20">
          <p className="text-blue-100 text-sm">
            © 2024 SalesFlow. All rights reserved.
          </p>
        </div>

        {/* Background shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login/Sign Up Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center p-8 sm:p-12">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? "Create Account" : "Welcome back"}
          </h2>
          <p className="text-gray-600 mb-8">
            {isSignUp
              ? "Sign up with your email to get started"
              : "Sign in to your account to continue"}
          </p>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name - Only for Sign Up */}
            {isSignUp && (
              <div>
                <Label htmlFor="fullName" className="text-gray-700 font-medium mb-2">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-gray-700 font-medium mb-2">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-gray-700 font-medium mb-2">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Role Selection - Only for Sign Up */}
            {isSignUp && (
              <div>
                <Label className="text-gray-700 font-medium mb-3 block">
                  Select Your Role
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["owner", "manager", "salesman"] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        selectedRole === role
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="mt-6 text-center">
            {!isSignUp && (
              <>
                <p className="text-gray-600 mb-4">Don't have an account?</p>
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up here
                </button>
              </>
            )}
            {isSignUp && (
              <>
                <p className="text-gray-600 mb-4">Already have an account?</p>
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setError("");
                    setSuccessMessage("");
                    setFullName("");
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>

          {/* Forgot Password Link - Only for Sign In */}
          {!isSignUp && (
            <div className="mt-4 text-center">
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                Forgot your password?
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;


