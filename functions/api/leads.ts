interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const data = await request.json() as {
      name: string;
      email: string;
      company?: string;
      phone?: string;
      service_interest?: string;
      message?: string;
      source?: string;
    };

    if (!data.name || !data.email) {
      return Response.json({ error: 'Name and email required' }, { status: 400 });
    }

    await env.DB.prepare(`
      INSERT INTO leads (name, email, company, phone, service_interest, message, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.email,
      data.company || null,
      data.phone || null,
      data.service_interest || null,
      data.message || null,
      data.source || 'connect-hub'
    ).run();

    return Response.json({ success: true, message: 'Lead captured' });
  } catch (err) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
};
