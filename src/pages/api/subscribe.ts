import type { APIRoute } from 'astro';

export const prerender = false;

const MAX_BODY_BYTES = 8_192;
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  const key = `rl:subscribe:${ip}`;
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

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('Origin');
  try {
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('application/json')) return jsonResponse({ error: 'Unsupported content type' }, 415, origin);

    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: 'Payload too large' }, 413, origin);

    const env = locals.runtime.env;
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(env.SESSION, ip);
    if (!allowed) return jsonResponse({ error: 'Too many requests' }, 429, origin);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return jsonResponse({ error: 'Invalid JSON' }, 400, origin);

    const email = sanitizeText(body.email, 254).toLowerCase();
    const name = sanitizeText(body.name, 120);
    const plan_id = sanitizeText(body.plan_id, 64);
    const plan_name = sanitizeText(body.plan_name, 64);
    const amount = Math.max(0, Math.min(parseInt(body.amount, 10) || 0, 10_000_000));
    const razorpay_subscription_id = sanitizeText(body.razorpay_subscription_id, 64);

    if (!isValidEmail(email)) return jsonResponse({ error: 'Invalid email' }, 400, origin);
    if (!plan_id) return jsonResponse({ error: 'plan_id required' }, 400, origin);

    const result = await env.DB.prepare(
      `INSERT INTO subscribers (email, name, plan_id, plan_name, status, amount, razorpay_subscription_id, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name, plan_id = excluded.plan_id, plan_name = excluded.plan_name,
         status = excluded.status, amount = excluded.amount,
         razorpay_subscription_id = excluded.razorpay_subscription_id`
    ).bind(
      email,
      name || null,
      plan_id,
      plan_name || null,
      'active',
      amount,
      razorpay_subscription_id || null
    ).run();

    return jsonResponse({ success: true, id: result.meta.last_row_id }, 201, origin);
  } catch (err) {
    console.error('subscribe POST error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
};