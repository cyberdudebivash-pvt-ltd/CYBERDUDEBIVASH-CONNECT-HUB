import type { APIRoute } from 'astro';

export const prerender = false;

// ── Security helpers ────────────────────────────────
const MAX_BODY_BYTES = 16_384;   // 16 KB max payload
const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX = 5;

const ALLOWED_ORIGINS = [
  'https://connect.cyberdudebivash.com',
  'https://www.cyberdudebivash.com',
  'https://cyberdudebivash.com',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function sanitizeText(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen).replace(/[<>]/g, '');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function checkRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `rl:leads:${ip}`;
  const current = parseInt((await kv.get(key)) || '0', 10);
  if (current >= RATE_LIMIT_MAX) return false;
  await kv.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_S });
  return true;
}

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

function jsonResponse(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── OPTIONS preflight ────────────────────────────────
export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
};

// ── POST — submit lead ───────────────────────────────
export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('Origin');

  try {
    // 1. Content type check
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('application/json')) {
      return jsonResponse({ error: 'Unsupported content type' }, 415, origin);
    }

    // 2. Body size check
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Payload too large' }, 413, origin);
    }

    // 3. Rate limit per IP
    const ip = getClientIp(request);
    const env = locals.runtime.env;
    const allowed = await checkRateLimit(env.SESSION, ip);
    if (!allowed) {
      return jsonResponse({ error: 'Too many requests. Try again in a minute.' }, 429, origin);
    }

    // 4. Parse + validate
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON' }, 400, origin);
    }

    const name = sanitizeText(body.name, 120);
    const email = sanitizeText(body.email, 254).toLowerCase();
    const company = sanitizeText(body.company, 120);
    const phone = sanitizeText(body.phone, 32);
    const service_interest = sanitizeText(body.service_interest, 120);
    const message = sanitizeText(body.message, 2000);
    const source = sanitizeText(body.source, 64) || 'website';

    if (name.length < 2) return jsonResponse({ error: 'Invalid name' }, 400, origin);
    if (!isValidEmail(email)) return jsonResponse({ error: 'Invalid email' }, 400, origin);

    // 5. Insert
    const result = await env.DB.prepare(
      `INSERT INTO leads (name, email, company, phone, service_interest, message, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name,
      email,
      company || null,
      phone || null,
      service_interest || null,
      message || null,
      source
    ).run();

    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, origin);

  } catch (err) {
    console.error('leads POST error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
};

// ── GET — read leads (basic, no auth by design) ──────
export const GET: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('Origin');
  try {
    const env = locals.runtime.env;
    const { results } = await env.DB.prepare(
      `SELECT id, name, email, company, service_interest, status, source, created_at
       FROM leads ORDER BY created_at DESC LIMIT 50`
    ).all();
    return jsonResponse({ leads: results }, 200, origin);
  } catch (err) {
    console.error('leads GET error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
};