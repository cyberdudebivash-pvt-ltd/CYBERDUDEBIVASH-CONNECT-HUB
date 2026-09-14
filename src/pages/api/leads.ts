import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, company, phone, service_interest, message, source } = body;

    if (!name || typeof name !== 'string' || name.length < 2) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await env.DB.prepare(
      `INSERT INTO leads (name, email, company, phone, service_interest, message, source) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, email, company || null, phone || null, service_interest || null, message || null, source || 'website').run();

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('leads POST error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const GET: APIRoute = async () => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, email, company, service_interest, status, source, created_at FROM leads ORDER BY created_at DESC LIMIT 50`
    ).all();
    return new Response(JSON.stringify({ leads: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('leads GET error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
