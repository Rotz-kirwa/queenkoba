import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SEO from "@/components/SEO";
import GoogleContinueButton from "@/components/auth/GoogleContinueButton";
import { consumeAuthRedirect } from "@/lib/authRedirect";

const Login = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [redirectPath] = useState(
    () => (location.state as { from?: string } | null)?.from || consumeAuthRedirect() || '/shop'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      navigate(redirectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign in. Please try again.";
      toast({ title: 'Login Failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <SEO
        title="Login"
        description="Sign in to your Queen Koba account."
        path="/login"
        robots="noindex,nofollow"
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md px-4"
      >
        <div className="luxury-card">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-light mb-2">
              Welcome <span className="italic text-gold-gradient">Back</span>
            </h1>
            <p className="text-sm text-muted-foreground font-body">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="login-email" className="block text-sm font-body mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-body mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="login-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use the password you created for your Queen Koba account.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold-gradient text-primary-foreground font-body font-bold text-sm tracking-widest uppercase rounded-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-body uppercase tracking-[0.22em] text-muted-foreground">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleContinueButton
            mode="signin"
            redirectPath={redirectPath}
            successMessage="Successfully signed in with Google."
            errorTitle="Google Sign-In Failed"
          />

          <p className="text-center text-sm text-muted-foreground font-body mt-6">
            Don't have an account?{' '}
            <Link
              to="/signup"
              state={{ from: redirectPath }}
              className="text-primary hover:underline font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
