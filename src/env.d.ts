/// <reference types="astro/client" />

type Env = {
  DB: D1Database;
  SESSION: KVNamespace;
  PUBLIC_BRAND_NAME: string;
  PUBLIC_TAGLINE: string;
  PUBLIC_INTEL_API: string;
  PUBLIC_CONTACT_EMAIL: string;
  PUBLIC_SALES_EMAIL: string;
  PUBLIC_PHONE: string;
  PUBLIC_WHATSAPP: string;
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
