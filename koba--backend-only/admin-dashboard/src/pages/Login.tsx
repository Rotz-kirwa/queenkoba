import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { getGoogleClientId, loadGoogleIdentityScript } from '../lib/googleAuth';
import {
  getCurrentOrigin,
  hasInitializedGoogleForKey,
  markGoogleInitialized,
  shouldEnableGoogleAuth,
} from '../lib/browser';

const BRAND_LOGO_URL = "/queen-koba-logo.jpg";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleMessage, setGoogleMessage] = useState('Use your verified Google account to continue.');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { login, loginWithGoogle } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let buttonRenderTimer: number | undefined;

    const setUnrenderedGoogleMessage = () => {
      const origin = getCurrentOrigin();
      setGoogleReady(false);
      setGoogleMessage(
        origin
          ? `Google sign-in could not be rendered for ${origin}. Add this origin to Authorized JavaScript origins in Google Cloud Console.`
          : 'Google sign-in could not be rendered for this environment.',
      );
    };

    const initializeGoogle = async () => {
      const clientId = getGoogleClientId();
      if (!shouldEnableGoogleAuth(clientId)) {
        setGoogleMessage(
          'Google sign-in is disabled on this origin. Enable local Google auth with an authorized client ID to use it here.',
        );
        setGoogleReady(false);
        return;
      }

      try {
        await loadGoogleIdentityScript();

        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
          return;
        }

        const initKey = `admin-auth:${clientId}`;
        if (!hasInitializedGoogleForKey(initKey)) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async ({ credential }) => {
              setError('');
              setGoogleLoading(true);

              try {
                await loginWithGoogle(credential);
                navigate('/admin');
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Google sign-in failed';
                setError(message);
              } finally {
                setGoogleLoading(false);
              }
            },
            context: 'signin',
            ux_mode: 'popup',
          });
          markGoogleInitialized(initKey);
        }

        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 368,
        });

        setGoogleReady(true);
        setGoogleMessage('Use your verified Google account to continue.');
        buttonRenderTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          const hasRenderedButton = Boolean(
            googleButtonRef.current?.querySelector("iframe[src*='accounts.google.com/gsi/button']"),
          );
          if (!hasRenderedButton) {
            setUnrenderedGoogleMessage();
          }
        }, 1800);
      } catch (err) {
        if (!cancelled) {
          setGoogleReady(false);
          const message = err instanceof Error ? err.message : 'Google sign-in failed to load';
          setGoogleMessage(message);
        }
      }
    };

    void initializeGoogle();

    return () => {
      cancelled = true;
      if (buttonRenderTimer) {
        window.clearTimeout(buttonRenderTimer);
      }
    };
  }, [loginWithGoogle, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={BRAND_LOGO_URL}
            alt="Queen Koba Logo"
            className="h-20 w-auto mx-auto mb-3 rounded-lg"
          />
          <h1 className="text-4xl font-serif text-[#8B6F47] mb-2">Queen Koba</h1>
          <p className="text-gray-600">Admin Dashboard</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-login-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-input"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full admin-btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            {googleReady ? (
              <div
                ref={googleButtonRef}
                className="min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 bg-white"
              />
            ) : (
              <div className="min-h-[44px] rounded-lg border border-dashed border-gray-200 bg-gray-50" />
            )}
            <p className="text-center text-xs text-gray-500">
              {googleLoading
                ? 'Completing Google sign-in...'
                : googleMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
