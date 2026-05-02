import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/medical/share — create a share token
export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { expiresInHours = 24 } = await req.json().catch(() => ({}));
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('health_shares').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      revoked: false,
    });

    if (error) {
      // Table may not exist yet — return token with note
      console.warn('health_shares table missing:', error.message);
      return NextResponse.json({
        success: true,
        token,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${token}`,
        expiresAt,
        note: 'DB table health_shares not yet created. Run migration first.',
      });
    }

    return NextResponse.json({
      success: true,
      token,
      shareUrl: `/share/${token}`,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/medical/share?token=xxx — revoke a share token
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await supabase.from('health_shares').update({ revoked: true }).eq('token', token).eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/medical/share?token=xxx — fetch shared health file (public, no auth)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    // Use service role for reading (no user session on public page)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: share } = await supabase
      .from('health_shares')
      .select('*')
      .eq('token', token)
      .single();

    if (!share) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    if (share.revoked) return NextResponse.json({ error: 'This link has been revoked' }, { status: 410 });
    if (new Date(share.expires_at) < new Date()) return NextResponse.json({ error: 'Link has expired' }, { status: 410 });

    const [{ data: profile }, { data: records }] = await Promise.all([
      supabase.from('profiles').select('full_name, age, gender, blood_type, allergies').eq('id', share.user_id).single(),
      supabase.from('medical_records').select('title, category, record_date, facility').eq('user_id', share.user_id).order('record_date', { ascending: false }).limit(20),
    ]);

    return NextResponse.json({
      success: true,
      profile,
      records: records || [],
      expiresAt: share.expires_at,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
