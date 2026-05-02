import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { askAI } from '@/lib/ai/client';

const DIET_PROMPT = (ingredients, budget, conditions) => `
You are Agent 5 (Diet Planner) of Neural Nurture — India's AI health assistant.
Create a 7-day meal plan using ONLY the ingredients the user has available.

User's available ingredients: ${ingredients.join(', ')}
Daily budget: ₹${budget}
Health conditions from medical file: ${conditions || 'None'}

Rules:
- Use ONLY the listed ingredients — no exotic superfoods, no unavailable items
- Every meal must be realistic Indian food (dal-chawal, roti-sabzi, poha, upma, etc.)
- Total daily cost must NOT exceed ₹${budget}
- High BP → less salt, more potassium (banana, spinach, dal)
- Diabetes risk → fewer refined carbs, more fiber
- Pregnancy/women → more iron (palak, rajma) and calcium (milk, curd)

Return ONLY this JSON (no markdown):
{
  "days": [
    {
      "day": "Monday",
      "meals": [
        {
          "type": "Breakfast | Lunch | Dinner | Snack",
          "name": "Meal name",
          "description": "Brief description in 1 sentence",
          "calories": 300,
          "cost": 25
        }
      ]
    }
  ],
  "totalDailyBudget": ${budget},
  "nutritionNotes": "One key nutrition tip based on their conditions"
}
`.trim();

export async function POST(req) {
  try {
    const { ingredients = [], budget = 100 } = await req.json();

    if (!ingredients.length) {
      return NextResponse.json({ error: 'No ingredients selected' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    let conditions = 'None';
    if (user) {
      const { data: records } = await supabase
        .from('medical_records')
        .select('title')
        .eq('user_id', user.id)
        .limit(5);
      if (records?.length) conditions = records.map(r => r.title).join(', ');
    }

    const raw = await askAI({
      system: DIET_PROMPT(ingredients, budget, conditions),
      messages: [{ role: 'user', content: `Create my 7-day diet plan with ₹${budget}/day budget using: ${ingredients.join(', ')}` }],
      temperature: 0.3,
      agentHint: 'diet',
    });

    let plan;
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      plan = JSON.parse(raw.substring(start, end + 1));
    } catch (_) {
      return NextResponse.json({ error: 'Failed to parse diet plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Diet plan error:', error);
    return NextResponse.json({ error: 'Failed to generate diet plan' }, { status: 500 });
  }
}
