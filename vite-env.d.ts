/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VPN_MODE?: string;
  readonly VITE_SHOW_FONT_BADGE?: string;
  readonly VITE_ENABLE_DEV_TOOLS?: string;
  readonly VITE_ANALYTICS_ID?: string;
  readonly VITE_ERROR_MONITORING_KEY?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
