import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, name, plan_id, plan_name, amount, razorpay_subscription_id } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await env.DB.prepare(
      `INSERT INTO subscribers (email, name, plan_id, plan_name, status, amount, razorpay_subscription_id, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(email) DO UPDATE SET name = excluded.name, plan_id = excluded.plan_id, plan_name = excluded.plan_name, status = excluded.status, amount = excluded.amount, razorpay_subscription_id = excluded.razorpay_subscription_id`
    ).bind(email, name || null, plan_id, plan_name || null, 'active', amount || 0, razorpay_subscription_id || null).run();

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('subscribe POST error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
