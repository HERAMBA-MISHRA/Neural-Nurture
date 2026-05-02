import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { runWellnessAgent } from '@/lib/agents/pipeline';


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

    const [{ data: profile }, { data: records }] = await Promise.all([
      supabase.from('profiles').select('age, weight, height').eq('id', user.id).single(),
      supabase.from('medical_records').select('title, category').eq('user_id', user.id).limit(10),
    ]);

    const conditions = records?.map(r => r.title).join(', ') || 'None';

    const plan = await runWellnessAgent({ profile, conditions });

    // Store plan in Supabase for persistence
    await supabase.from('meal_plans').delete().eq('user_id', user.id);
    const rows = [];
    plan.days?.forEach(d => {
      d.activities?.forEach(a => {
        rows.push({
          user_id: user.id,
          day_of_week: d.day,
          meal_type: a.intensity,
          title: a.name,
          description: a.instructions,
          calories: a.duration,
          prep_time: a.duration,
          image_url: null,
          macros: { planType: plan.planType, weeklyGoal: plan.weeklyGoal },
        });
      });
    });

    if (rows.length) await supabase.from('meal_plans').insert(rows);

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Wellness plan error:', error);
    return NextResponse.json({ error: 'Failed to generate wellness plan' }, { status: 500 });
  }
}
