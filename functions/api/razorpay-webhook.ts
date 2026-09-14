interface Env {
  DB: D1Database;
  RAZORPAY_WEBHOOK_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const signature = request.headers.get('x-razorpay-signature');
  const body = await request.text();

  const expected = await hmac(body, env.RAZORPAY_WEBHOOK_SECRET);
  if (signature !== expected) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
    const sub = event.payload.subscription.entity;
    const customer = event.payload.payment?.entity?.email || 'unknown';

    await env.DB.prepare(`
      INSERT INTO subscribers (email, plan_id, status, amount, razorpay_subscription_id, started_at)
      VALUES (?, ?, 'active', ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        status = 'active',
        amount = excluded.amount,
        started_at = excluded.started_at
    `).bind(
      customer,
      sub.plan_id,
      sub.paid_count || 0,
      sub.id,
      new Date(sub.start_at * 1000).toISOString()
    ).run();
  }

  if (event.event === 'subscription.cancelled') {
    const sub = event.payload.subscription.entity;
    await env.DB.prepare(`
      UPDATE subscribers SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
      WHERE razorpay_subscription_id = ?
    `).bind(sub.id).run();
  }

  return new Response('OK');
};

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
