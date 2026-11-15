/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LEARNLY_BOOTSTRAP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
