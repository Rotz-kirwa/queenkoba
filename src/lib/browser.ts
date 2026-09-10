const createPseudoUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
      (
        Number(char) ^
        ((crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (Number(char) / 4))
      ).toString(16),
    );
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const resolved = char === "x" ? value : (value & 0x3) | 0x8;
    return resolved.toString(16);
  });
};

export const ensureRandomUuid = () => {
  if (typeof globalThis === "undefined") {
    return createPseudoUuid;
  }

  const cryptoLike = (globalThis as typeof globalThis & {
    crypto?: Crypto & { randomUUID?: () => string };
  }).crypto;

  if (cryptoLike && typeof cryptoLike.randomUUID === "function") {
    return cryptoLike.randomUUID.bind(cryptoLike);
  }

  if (cryptoLike) {
    try {
      Object.defineProperty(cryptoLike, "randomUUID", {
        configurable: true,
        value: createPseudoUuid,
      });
      return createPseudoUuid;
    } catch {
      // Some environments expose crypto as non-configurable. In that case
      // we still return a safe fallback for app code to use directly.
    }
  }

  return createPseudoUuid;
};

export const getCurrentOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

const isLocalGoogleAuthEnabled = () =>
  String(import.meta.env.VITE_ENABLE_LOCAL_GOOGLE_AUTH || "").toLowerCase() === "true";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_DEV_PORTS = new Set(["3000", "3001", "5173", "5174", "8080", "8081"]);

const isSupportedLocalOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && LOCAL_DEV_HOSTS.has(url.hostname) && LOCAL_DEV_PORTS.has(url.port);
  } catch {
    return false;
  }
};

export const shouldEnableGoogleAuth = (clientId?: string) => {
  if (!clientId) {
    return false;
  }

  const origin = getCurrentOrigin();
  if (!origin) {
    return false;
  }

  if (isSupportedLocalOrigin(origin)) {
    return isLocalGoogleAuthEnabled();
  }

  try {
    const url = new URL(origin);
    return url.protocol === "https:";
  } catch {
    return origin.includes("queenkoba.com");
  }
};
