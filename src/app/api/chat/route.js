import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Groq from 'groq-sdk';
import { runTriagePipeline } from '@/lib/agents/pipeline';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VISION_PROMPT = `You are an expert medical report analyzer for Indian patients.
Analyze this medical report/prescription image with high accuracy.

IMPORTANT: Structure your response EXACTLY in these sections with these EXACT headers:

## Patient Info
Name: [extract or write "Not visible"]
Age/Sex: [extract or write "Not visible"]
Date: [extract or write "Not visible"]
Hospital: [extract or write "Not visible"]

## Diagnosis
[List the main condition/diagnosis, or "No diagnosis mentioned"]

## Test Results
Format each test EXACTLY as:
- [Test Name]: [Value] ([Normal/Abnormal - High/Low])
  → [Simple Hindi/English explanation in 1 line]

## Medicines Prescribed
Format each medicine EXACTLY as:
- [Medicine Name] [Dose]: [Timing] — [What it does in simple words]
Or write "No medicines prescribed"

## Normal Values Summary
List all values that are NORMAL in brief

## Values Needing Attention ⚠️
List all ABNORMAL values with simple explanation of what it means

## Urgent Red Flags 🚨
List anything that needs IMMEDIATE medical attention
Or write "No urgent values found"

## Doctor's Advice
[Any recommendations from the report]
Or write "No specific advice mentioned"

## Simple Summary for Patient
Write 3-4 lines in simple Hinglish explaining:
- Overall kya status hai (overall health status)
- Kya chinta ki baat hai (what to worry about)
- Agle step kya hone chahiye (what to do next)

LANGUAGE: Use simple Hinglish that any Indian patient understands.
Explain ALL medical terms simply. Be warm and reassuring in tone.
Never alarm unnecessarily but always recommend doctor for abnormals.`;

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      message,
      image,
      fileData,
      mimeType,
      messages = [],
      conversationHistory = [],
      location,
    } = body;

    const fullHistory = messages.length > 0 ? messages : conversationHistory;
    const imageBase64 = image || fileData?.base64;
    const imageMimeType = mimeType || fileData?.mimeType || 'image/jpeg';

    if (!message && !imageBase64) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // ── PATH A: Image / PDF → vision model ───────────────────────────────
    if (imageBase64) {
      console.log('[Chat API] Image received → vision analysis...');
      try {
        const response = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
              { type: 'text', text: VISION_PROMPT },
            ],
          }],
          max_tokens: 1500,
          temperature: 0.2,
        });

        const analysis = response.choices[0].message.content;
        console.log('[Image Analysis] Success, chars:', analysis.length);

        return NextResponse.json({
          success: true,
          reply: analysis,
          message: analysis,
          triage: null,
          type: 'report_analysis',
          predictedTitle: (fileData?.fileName || 'Medical Report').substring(0, 40),
        });

      } catch (error) {
        console.log('[Image Analysis Error]:', error.message, error.status ?? '');
        if (error.status === 429 || error.message?.includes('429')) {
          return NextResponse.json({
            success: true,
            reply: 'Thoda wait karein 🙏 30 seconds mein dobara try karein.',
            message: 'Thoda wait karein 🙏 30 seconds mein dobara try karein.',
            triage: null,
          });
        }
        return NextResponse.json({
          success: true,
          reply: 'Report analyze nahi ho payi. Clear photo mein dobara try karein. 📸',
          message: 'Report analyze nahi ho payi. Clear photo mein dobara try karein. 📸',
          triage: null,
          agentStage: 'vision_error',
        });
      }
    }

    // ── PATH B: Follow-up on previous long response ───────────────────────
    const userMessage = message || 'Analyze attached report';
    const lastAssistantMessage = fullHistory?.filter(m => m.role === 'assistant')?.slice(-1)[0]?.content;
    const messageWords = userMessage.trim().split(/\s+/).length;
    const isFollowUp = messageWords <= 5 && lastAssistantMessage?.length > 200;

    if (isFollowUp && lastAssistantMessage) {
      try {
        const followUpResponse = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: `You are a helpful medical assistant for Indian patients.
The user is asking a follow-up question about the previous medical information they shared.
Answer clearly in simple Hinglish (Hindi words in Roman script).
Keep the answer concise and warm.
Previous context:
${lastAssistantMessage.slice(0, 1500)}`,
            },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 500,
        });
        const followUpReply = followUpResponse.choices[0].message.content;
        return NextResponse.json({ success: true, reply: followUpReply, triage: null, type: 'follow_up' });
      } catch (error) {
        console.log('[Follow-up Error]:', error.message);
      }
    }

    // ── PATH C: Text message → triage pipeline ────────────────────────────
    const result = await runTriagePipeline(user?.id ?? null, userMessage, location ?? null, fullHistory);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Chat API] Pipeline error:', error.message);
    const is429 = error.status === 429 || error.statusCode === 429
      || error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');
    if (is429) {
      return NextResponse.json({
        success: true,
        reply: 'Thoda sa wait karein 🙏 Abhi bahut log use kar rahe hain. 30 seconds mein dobara try karein.',
        triage: null,
      });
    }
    return NextResponse.json({ error: error.message || 'AI pipeline unavailable' }, { status: 500 });
  }
}
