import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { askAI } from '@/lib/ai/client';

const SUMMARY_PROMPT = (patientInfo, clinicalHistory, habitHistory) => `
You are a Senior Clinical AI synthesizing a patient's longitudinal health record.

PATIENT: ${patientInfo}
CLINICAL RECORDS: ${clinicalHistory}
WELLNESS LOGS (last 30 days): ${habitHistory}

Task:
1. Build a chronological timeline of health progression
2. Identify recurring patterns (3+ respiratory infections, seasonal BP changes, etc.)
3. Suggest next clinical steps

Return ONLY this JSON (no markdown):
{
  "patientInfo": { "name": "...", "age": "...", "gender": "..." },
  "overview": {
    "status": "Stable | Action Needed | Critical",
    "analysis": "Detailed longitudinal timeline starting from earliest record.",
    "clinicalTraj": "Where is this patient heading health-wise?"
  },
  "trends": [{ "topic": "Respiratory/Metabolic/etc", "observation": "...", "status": "Positive | Warning" }],
  "progress": { "highlights": ["win 1"], "concerns": ["issue 1"] },
  "recommendations": [{ "action": "...", "priority": "High | Med | Low", "reason": "..." }]
}
`.trim();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: records }, { data: logs }, { data: profile }] = await Promise.all([
      supabase.from('medical_records').select('*').eq('user_id', user.id).order('record_date', { ascending: true }),
      supabase.from('wellness_logs').select('*').eq('user_id', user.id).limit(30),
      supabase.from('profiles').select('full_name, age, gender').eq('id', user.id).single(),
    ]);

    if (!records?.length && !logs?.length) {
      return NextResponse.json({
        success: true,
        summary: 'No clinical data found yet. Upload a medical record or log wellness to generate a summary.',
      });
    }

    const patientInfo = `Name: ${profile?.full_name || 'N/A'}, Age: ${profile?.age || 'N/A'}, Gender: ${profile?.gender || 'N/A'}`;
    const clinicalHistory = records?.map(r => `${r.record_date}: ${r.title} (${r.category})`).join('\n') || 'No records';
    const habitHistory = logs?.map(l => `${l.log_date}: Water ${l.water_intake}L, Score ${l.daily_score}%`).join('\n') || 'No logs';

    const raw = await askAI({
      system: SUMMARY_PROMPT(patientInfo, clinicalHistory, habitHistory),
      messages: [{ role: 'user', content: 'Generate health summary.' }],
      temperature: 0.3,
      agentHint: 'summary',
    });

    let summary;
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      summary = JSON.parse(raw.substring(start, end + 1));
    } catch (_) {
      summary = { overview: { status: 'Stable', analysis: raw, clinicalTraj: '' }, trends: [], progress: { highlights: [], concerns: [] }, recommendations: [] };
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Summary Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
