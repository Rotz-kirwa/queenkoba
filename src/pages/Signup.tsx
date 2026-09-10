import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, UserPlus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SEO from "@/components/SEO";
import GoogleContinueButton from "@/components/auth/GoogleContinueButton";
import { consumeAuthRedirect } from "@/lib/authRedirect";

const Signup = () => {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [redirectPath] = useState(
    () => (location.state as { from?: string } | null)?.from || consumeAuthRedirect() || '/shop'
  );
  const passwordMeetsRequirements = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordMeetsRequirements.test(formData.password)) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters and include both letters and numbers.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await signup(formData.name, formData.email, formData.password, formData.phone);
      toast({ title: 'Account Created!', description: 'Welcome to Queen Koba.' });
      navigate(redirectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create account. Please try again.";
      toast({ title: 'Signup Failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <SEO
        title="Create Account"
        description="Create your Queen Koba account to manage checkout and orders."
        path="/signup"
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
              Create <span className="italic text-gold-gradient">Account</span>
            </h1>
            <p className="text-sm text-muted-foreground font-body">Join the Queen Koba family</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-body mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signup-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-body mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signup-email"
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
              <label htmlFor="signup-phone" className="block text-sm font-body mb-2">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="+254 712 345 678"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-body mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signup-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use at least 8 characters with both letters and numbers.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold-gradient text-primary-foreground font-body font-bold text-sm tracking-widest uppercase rounded-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Create Account'}
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
            mode="signup"
            redirectPath={redirectPath}
            successMessage="Your Google account is ready to shop."
            errorTitle="Google Sign-Up Failed"
          />

          <p className="text-center text-sm text-muted-foreground font-body mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              state={{ from: redirectPath }}
              className="text-primary hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
