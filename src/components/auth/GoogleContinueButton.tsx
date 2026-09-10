import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCurrentOrigin, shouldEnableGoogleAuth } from "@/lib/browser";
import { getGoogleClientId, loadGoogleIdentityScript } from "@/lib/googleAuth";

interface GoogleContinueButtonProps {
  mode: "signin" | "signup";
  redirectPath: string;
  successMessage: string;
  errorTitle: string;
}

const DEFAULT_MESSAGE = "Use your Google account to continue.";

const GoogleContinueButton = ({
  mode,
  redirectPath,
  successMessage,
  errorTitle,
}: GoogleContinueButtonProps) => {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleApiReady, setGoogleApiReady] = useState(false);
  const [googleMessage, setGoogleMessage] = useState(DEFAULT_MESSAGE);
  const [buttonWidth, setButtonWidth] = useState(368);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateWidth = () => {
      const width = Math.floor(containerRef.current?.getBoundingClientRect().width || 368);
      setButtonWidth(Math.max(240, Math.min(368, width)));
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const host = buttonHostRef.current;

    const initializeGoogle = async () => {
      const clientId = getGoogleClientId();
      if (!shouldEnableGoogleAuth(clientId)) {
        setGoogleReady(false);
        setGoogleApiReady(false);
        setGoogleMessage(
          "Google sign-in is disabled on this origin. Use email/password, or enable local Google auth with an authorized client ID.",
        );
        return;
      }

      try {
        await loadGoogleIdentityScript();

        if (cancelled || !window.google?.accounts?.id || !buttonHostRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) {
              toast({
                title: errorTitle,
                description: "Google did not return a credential token.",
                variant: "destructive",
              });
              return;
            }

            setGoogleLoading(true);

            try {
              await loginWithGoogle(credential);
              toast({ title: "Welcome!", description: successMessage });
              navigate(redirectPath, { replace: true });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unable to continue with Google.";
              toast({
                title: errorTitle,
                description: errorMessage,
                variant: "destructive",
              });
            } finally {
              setGoogleLoading(false);
            }
          },
          context: mode,
          ux_mode: "popup",
        });

        setGoogleApiReady(true);
        setGoogleMessage(DEFAULT_MESSAGE);
      } catch (error) {
        if (!cancelled) {
          setGoogleReady(false);
          setGoogleApiReady(false);
          setGoogleMessage(
            error instanceof Error ? error.message : "Google sign-in could not be loaded for this environment.",
          );
        }
      }
    };

    void initializeGoogle();

    return () => {
      cancelled = true;
      if (host) {
        host.innerHTML = "";
      }
    };
  }, [errorTitle, loginWithGoogle, mode, navigate, redirectPath, successMessage, toast]);

  useEffect(() => {
    if (!googleApiReady || !window.google?.accounts?.id || !buttonHostRef.current) {
      return;
    }

    setGoogleReady(false);
    buttonHostRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(buttonHostRef.current, {
      theme: "outline",
      size: "large",
      text: mode === "signup" ? "signup_with" : "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: buttonWidth,
    });

    const renderCheckTimer = window.setTimeout(() => {
      const hasRenderedButton = Boolean(
        buttonHostRef.current?.querySelector("iframe[src*='accounts.google.com/gsi/button']"),
      );

      if (hasRenderedButton) {
        setGoogleReady(true);
        setGoogleMessage(DEFAULT_MESSAGE);
        return;
      }

      const origin = getCurrentOrigin();
      setGoogleReady(false);
      setGoogleMessage(
        origin
          ? `Google sign-in could not be rendered for ${origin}. Add this origin to Authorized JavaScript origins in Google Cloud Console.`
          : "Google sign-in could not be rendered for this environment.",
      );
    }, 1200);

    return () => window.clearTimeout(renderCheckTimer);
  }, [buttonWidth, googleApiReady, mode]);

  return (
    <>
      <div
        ref={containerRef}
        className={`min-h-[44px] rounded-sm border bg-background px-2 py-1 ${
          googleReady ? "border-border" : "border-dashed border-border"
        }`}
      >
        <div ref={buttonHostRef} className="flex min-h-[36px] items-center justify-center" />
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground font-body">
        {googleLoading ? "Connecting to Google..." : googleMessage}
      </p>
    </>
  );
};

export default GoogleContinueButton;
