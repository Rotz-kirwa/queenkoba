declare global {
  interface Window {
    __queenkobaAdminGoogleInitKey?: string;
  }
}

export const getCurrentOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const isLocalGoogleAuthEnabled = () =>
  String((import.meta.env as any).VITE_ENABLE_LOCAL_GOOGLE_AUTH || "").toLowerCase() === "true";

export const shouldEnableGoogleAuth = (clientId?: string) => {
  if (!clientId) {
    return false;
  }

  const origin = getCurrentOrigin();
  if (!origin) {
    return false;
  }

  return (
    ((origin === "http://localhost:5174" || origin === "http://127.0.0.1:5174") &&
      isLocalGoogleAuthEnabled()) ||
    origin.includes("queenkoba.com")
  );
};

export const hasInitializedGoogleForKey = (key: string) =>
  typeof window !== "undefined" && window.__queenkobaAdminGoogleInitKey === key;

export const markGoogleInitialized = (key: string) => {
  if (typeof window !== "undefined") {
    window.__queenkobaAdminGoogleInitKey = key;
  }
};
