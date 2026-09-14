import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const status: any = { ok: true, timestamp: new Date().toISOString() };

  try {
    const row = await env.DB.prepare('SELECT COUNT(*) as c FROM leads').first();
    status.d1 = { connected: true, leadCount: row?.c ?? 0 };
  } catch (err: any) {
    status.d1 = { connected: false, error: err.message };
    status.ok = false;
  }

  try {
    const probe = `health-${Date.now()}`;
    await env.SESSION.put('__health__', probe, { expirationTtl: 60 });
    const read = await env.SESSION.get('__health__');
    status.kv = { connected: read === probe };
    if (read !== probe) status.ok = false;
  } catch (err: any) {
    status.kv = { connected: false, error: err.message };
    status.ok = false;
  }

  return new Response(JSON.stringify(status, null, 2), {
    status: status.ok ? 200 : 503,
    headers: { 'Content-Type': 'application/json' }
  });
};
