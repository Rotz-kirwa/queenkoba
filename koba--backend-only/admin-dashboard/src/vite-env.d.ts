/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ALLOWED_EMAILS?: string;
  readonly VITE_ENABLE_LOCAL_GOOGLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type GoogleCredentialResponse = {
  credential: string;
  select_by: string;
};

type GoogleAccountsIdConfiguration = {
  auto_select?: boolean;
  callback: (response: GoogleCredentialResponse) => void;
  client_id: string;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup" | "redirect";
};

type GoogleButtonConfiguration = {
  logo_alignment?: "center" | "left";
  shape?: "circle" | "pill" | "rectangular" | "square";
  size?: "large" | "medium" | "small";
  text?: "continue_with" | "signin" | "signin_with" | "signup_with";
  theme?: "filled_black" | "filled_blue" | "outline";
  width?: number | string;
};

interface Window {
  google?: {
    accounts: {
      id: {
        disableAutoSelect: () => void;
        initialize: (config: GoogleAccountsIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
      };
    };
  };
}
