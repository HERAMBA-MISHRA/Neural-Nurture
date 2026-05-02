import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnableParallel, RunnableLambda } from "@langchain/core/runnables";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { searchNearbyHospitals } from "@/lib/places/client";

// ─── LLM factory — new instance per call (stateless, serverless-safe) ────────
function makeLLM() {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
  });
}

// ─── Retry wrapper for Groq 429 rate limits ──────────────────────────────────
async function callWithRetry(fn, retries = 2) {
  try {
    return await fn();
  } catch (error) {
    const is429 = error.status === 429
      || error.statusCode === 429
      || error.code === 'rate_limit_exceeded'
      || error.message?.includes('429')
      || error.message?.toLowerCase().includes('rate limit');
    if (is429 && retries > 0) {
      console.log(`[Rate Limit] Groq 429 — waiting 5s, retries left: ${retries - 1}`);
      await new Promise(r => setTimeout(r, 5000));
      return callWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

// ─── Supabase (anon key, read-only history reads) ────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 1 — INTAKE
// Language detector + symptom completeness checker
// Chain: ChatPromptTemplate → ChatGroq.withStructuredOutput → Zod object
// ════════════════════════════════════════════════════════════════════════════

const intakeSchema = z.object({
  language: z.enum(["english", "hindi", "hinglish"])
    .describe("Detected language of the user message"),
  isComplete: z.union([z.boolean(), z.string()])
    .transform(val => (typeof val === "string" ? val === "true" : val))
    .describe("true if message has at least a symptom name PLUS one of: duration, severity 1-10, or body location. false if too vague."),
  normalizedSymptoms: z.string()
    .describe("Symptom description translated/normalized to English. Empty string if isComplete is false."),
  followUpQuestion: z.string()
    .describe("One warm follow-up question in the user's detected language when isComplete is false. Empty string when isComplete is true."),
});

const INTAKE_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", `You are Agent 1 (Intake) of Neural Nurture — India's AI health assistant.

TASKS:
1. Detect language from the current message: english | hindi | hinglish
2. Review ALL conversation messages (history + current) to decide if enough symptom info exists for triage
3. If COMPLETE → set isComplete: true, normalize all symptoms to English in normalizedSymptoms
4. If INCOMPLETE → set isComplete: false, write ONE warm follow-up question

LANGUAGE DETECTION:
- Devanagari script or mostly Hindi vocabulary → "hindi"
- Hindi words in Roman script mixed with English → "hinglish"
- Pure English → "english"

COMPLETE = symptom name + at least ONE of: duration / severity / body location
COMPLETE examples: "fever for 2 days", "2 din se bukhar", "kal raat se sir dard", "chest pain", "headache since morning", "sir mein dard"
INCOMPLETE examples: "not well", "I'm sick" (no symptom detail at all)

CRITICAL RULES — MUST FOLLOW:
1. If ANY message in the history OR current message mentions time/duration (kal se, 2 din se, kal raat se, since yesterday, subah se, 1 ghante se, raat bhar, etc.) → set isComplete: true IMMEDIATELY
2. If the conversation already has 1+ previous user messages → be lenient, mark isComplete: true if any symptom is identifiable
3. NEVER ask about information already given in previous messages
4. NEVER ask the same question twice — check history for any unanswered follow-up
5. If user answered your previous follow-up question → set isComplete: true

Set followUpQuestion to "" when isComplete is true.
Set normalizedSymptoms to "" when isComplete is false.
Never diagnose. Be warm and conversational.
isComplete must be JSON boolean true or false (not a string).`],
  ["human", "Previous conversation:\n{conversationHistory}\n\nCurrent message: {message}"],
]);

export async function runIntakeAgent(message, conversationHistory = []) {
  const historyText = conversationHistory.length > 0
    ? conversationHistory.map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`).join('\n')
    : "No prior messages in this conversation.";

  const chain = INTAKE_PROMPT.pipe(makeLLM().withStructuredOutput(intakeSchema));
  return chain.invoke({ message, conversationHistory: historyText });
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 2 — MEMORY (RAG)
// Fetches last 5 Supabase sessions and summarizes relevant history
// Chain: RunnableLambda (Supabase fetch) → ChatPromptTemplate → ChatGroq → StringOutputParser
// ════════════════════════════════════════════════════════════════════════════

const fetchHistoryLambda = new RunnableLambda({
  func: async ({ userId, symptoms }) => {
    if (!userId) return { symptoms, rawHistory: null };

    try {
      const supabase = getSupabase();
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("id, title, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!sessions?.length) return { symptoms, rawHistory: null };

      const lines = await Promise.all(
        sessions.map(async (s) => {
          const { data: msgs } = await supabase
            .from("chat_messages")
            .select("content")
            .eq("session_id", s.id)
            .eq("role", "assistant")
            .order("created_at", { ascending: false })
            .limit(1);

          let label = "";
          const msg = msgs?.[0]?.content;
          if (msg?.includes("||TRIAGE_DATA||")) {
            try {
              const t = JSON.parse(msg.split("||TRIAGE_DATA||")[1]);
              label = ` → ${t.urgency} (${t.likely_cause || ""})`;
            } catch (_) {}
          }
          const line = `[${new Date(s.created_at).toLocaleDateString("en-IN")}] ${s.title}${label}`;
          return line.slice(0, 200);
        })
      );

      const filtered = lines.filter(Boolean);
      console.log('[Agent 2] History fetched:', filtered.length, 'sessions');
      return { symptoms, rawHistory: filtered.join("\n"), sessionCount: filtered.length };
    } catch (_) {
      return { symptoms, rawHistory: null };
    }
  },
});

const MEMORY_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", `You are Agent 2 (Memory) of Neural Nurture.
Summarize the patient's relevant medical history from past sessions in 2-3 sentences.
Focus only on: recurring conditions, previous urgency levels, known allergies or chronic conditions.
If no relevant patterns exist, reply: "No relevant prior history."`],
  ["human", "Current symptoms: {symptoms}\n\nPast sessions:\n{rawHistory}"],
]);

export async function runMemoryAgent({ userId, symptoms }) {
  const { rawHistory } = await fetchHistoryLambda.invoke({ userId, symptoms });
  if (!rawHistory) return { patientHistory: "No prior history available." };

  const chain = MEMORY_PROMPT.pipe(makeLLM()).pipe(new StringOutputParser());
  const summary = await chain.invoke({ symptoms, rawHistory });
  return { patientHistory: summary };
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 3 — TRIAGE
// WHO ICD-11 aligned urgency classifier with Zod structured output
// Chain: ChatPromptTemplate → ChatGroq.withStructuredOutput → Zod object
// ════════════════════════════════════════════════════════════════════════════

const triageSchema = z.object({
  urgency: z.enum(["GREEN", "YELLOW", "RED"])
    .describe("GREEN = self-care at home | YELLOW = doctor within 24h | RED = ER immediately"),
  reasoning: z.string()
    .describe("Clinical reasoning for this urgency level in one sentence"),
  assessment: z.string()
    .describe("Warm, reassuring message in the patient's detected language (Hinglish for Hindi). Never say 'I diagnose'. Include emoji."),
  likely_cause: z.string()
    .describe("Most probable condition or symptom pattern (not a confident diagnosis)"),
  specialist_needed: z.string()
    .describe("Specific doctor type, e.g. General Physician, Cardiologist, ENT Specialist"),
  home_care: z.array(z.string())
    .describe("4-6 specific actionable home-care steps with relevant emojis"),
  redFlags: z.array(z.string())
    .describe("2-4 warning signs that mean go to ER immediately"),
  whenToSeekHelp: z.string()
    .describe("Specific time guidance, e.g. 'Within 24 hours' or 'IMMEDIATELY — call 108'"),
  emergencySteps: z.array(z.string())
    .describe("For RED urgency ONLY: 3-5 immediate steps always including '📞 Call 108 (ambulance) immediately'. Empty array for GREEN and YELLOW."),
  // Extra fields for GREEN
  homeCareAdvice: z.array(z.string()).optional()
    .describe("For GREEN: 4-5 warm home care steps like 'Khoob paani piyen — din mein 8-10 glass'"),
  watchOut: z.array(z.string()).optional()
    .describe("For GREEN: 3-4 warning signs to monitor like 'Agar 48 ghanton mein theek nahi hua'"),
  followUp: z.string().optional()
    .describe("For GREEN: When to see doctor if not better, e.g. '2 din mein better nahi hua toh doctor ko zaroor dikhao'"),
  // Extra fields for YELLOW
  advice: z.array(z.string()).optional()
    .describe("For YELLOW: 3-4 pre-doctor steps like 'Doctor se milne se pehle paani peete rahein'"),
  whatToTellDoctor: z.array(z.string()).optional()
    .describe("For YELLOW: Key info to tell doctor, e.g. 'Exactly kab se symptoms hain'"),
  autoRedirect: z.boolean().optional()
    .describe("For YELLOW: true to show doctor finder button"),
  // Extra fields for RED
  immediateSteps: z.array(z.string()).optional()
    .describe("For RED: 3-5 immediate action steps, first must be '📞 Abhi 108 call karein (free ambulance)'"),
  emergencyNumber: z.string().optional()
    .describe("For RED: Always '108' in India"),
  autoRedirectToER: z.boolean().optional()
    .describe("For RED: true to show ER finder button"),
});

const TRIAGE_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", `You are Agent 3 (Triage) of Neural Nurture — a WHO ICD-11 aligned medical triage assistant for India.

URGENCY LEVELS & RESPONSE REQUIREMENTS:

GREEN — Self-resolving at home (mild cold, minor headache, slight fatigue, mild stomach ache)
  • assessment: Warm, reassuring. Example: "Aapke symptoms mild lagte hain — ghabrana bilkul nahi! Ghar par kuch simple cheezein try karein. 🌿"
  • homeCareAdvice: 4-5 specific steps like "Khoob paani piyen — din mein 8-10 glass", "Proper rest lein"
  • watchOut: 3-4 warning signs like "Agar 48 ghanton mein theek nahi hua", "Agar bukhar 103°F se zyada ho"
  • followUp: e.g., "2 din mein better nahi hua toh doctor ko zaroor dikhao 🙏"

YELLOW — Doctor needed within 24 hours (fever 3+ days, persistent pain, vomiting 24h+, infection signs)
  • assessment: Calm but clear need for doctor. Example: "Aapke symptoms dekh kar lagta hai doctor se milna zaroori hai. Ghabrana nahi — yeh serious nahi lag raha, but professional advice lena better hoga. 😊"
  • advice: 3-4 pre-doctor steps like "Doctor se milne se pehle paani peete rahein", "Aspirin avoid karein jab tak doctor na bolein"
  • whatToTellDoctor: Key info to communicate like "Exactly kab se symptoms hain", "Kya khaya tha pehle", "Koi aur family member bhi toh beemar nahi"
  • autoRedirect: true (to show doctor finder button)
  • specialist_needed: The exact specialty needed

RED — Emergency NOW (chest pain, breathing difficulty, stroke signs, high fever + neck stiffness, loss of consciousness, severe bleeding)
  • assessment: Urgent but calm. Example: "Yeh symptoms serious hain — abhi turant medical help lein. Shant rahein, help aa rahi hai. ❤️"
  • immediateSteps: 3-5 steps, FIRST must be "📞 Abhi 108 call karein (free ambulance)"
  • emergencyNumber: Always "108"
  • autoRedirectToER: true (to show ER finder button)

CRITICAL RULES — NEVER BREAK THESE:
- Never provide a confident diagnosis — always triage and advise
- Always recommend professional care for YELLOW and RED
- RED cases MUST have "📞 Abhi 108 call karein (free ambulance)" as first immediateStep
- Write the assessment field in the patient's detected language: {language}
- For Hindi/Hinglish: write assessment in Hinglish (Hindi meaning, Roman script)
- India context: mention 108 for RED, nearest government hospital for YELLOW, PHC/home for GREEN
- For GREEN: Leave advice, whatToTellDoctor, emergencySteps, emergencyNumber, autoRedirectToER empty
- For YELLOW: Leave homeCareAdvice, watchOut, followUp, immediateSteps, emergencyNumber, autoRedirectToER empty
- For RED: Leave homeCareAdvice, watchOut, followUp, advice, whatToTellDoctor, autoRedirect empty`],
  ["human", "Patient language: {language}\nCurrent symptoms: {symptoms}\nPatient history: {history}"],
]);

export async function runTriageAgent({ symptoms, patientHistory, language }) {
  const chain = TRIAGE_PROMPT.pipe(makeLLM().withStructuredOutput(triageSchema));
  return chain.invoke({ language, symptoms, history: patientHistory });
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 4 — MATCHING
// Doctor/hospital finder — wraps searchNearbyHospitals with RunnableLambda
// RED → nearest + openNow | YELLOW → bestRating
// ════════════════════════════════════════════════════════════════════════════

const matchingLambda = new RunnableLambda({
  func: async ({ urgency, location, specialistNeeded }) => {
    if (urgency === "GREEN" || !location?.lat || !location?.lng) {
      return { hospitals: [], recommendedFilter: null };
    }

    const filter = urgency === "RED" ? "openNow" : "bestRating";
    try {
      const hospitals = await searchNearbyHospitals({
        lat: location.lat,
        lng: location.lng,
        filter,
        radius: urgency === "RED" ? 10000 : 5000,
        specialty: specialistNeeded || null,
      });
      return { hospitals: hospitals.slice(0, 5), recommendedFilter: filter };
    } catch (_) {
      return { hospitals: [], recommendedFilter: filter };
    }
  },
});

export async function runMatchingAgent({ urgency, location, specialistNeeded }) {
  return matchingLambda.invoke({ urgency, location, specialistNeeded });
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 5 — WELLNESS (runs independently from /api/wellness/generate-plan)
// Personalized 7-day plan adjusted for age, weight, and health conditions
// Chain: ChatPromptTemplate → ChatGroq.withStructuredOutput → Zod object
// ════════════════════════════════════════════════════════════════════════════

const wellnessSchema = z.object({
  planType: z.string()
    .describe("Short descriptive name of this wellness plan"),
  weeklyGoal: z.string()
    .describe("Primary health goal for the week in one sentence"),
  days: z.array(
    z.object({
      day: z.string().describe("Day name e.g. Monday"),
      activities: z.array(
        z.object({
          name: z.string(),
          duration: z.number().describe("Duration in minutes"),
          intensity: z.enum(["Low", "Moderate", "High"]),
          instructions: z.string().describe("Clear 1-2 sentence how-to instructions"),
        })
      ),
    })
  ).describe("Exactly 7 days of activities"),
  dietSuggestions: z.array(z.string())
    .describe("4-5 practical Indian diet tips tailored to the patient's conditions"),
  medicines: z.array(z.string())
    .describe("List of existing medicines to take as reminders — never prescribe new ones. Empty array if none known."),
});

const WELLNESS_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", `You are Agent 5 (Wellness) of Neural Nurture — a personalized wellness planner for India.

Generate a realistic 7-day plan. Rules:
- Yoga, walking, pranayama — assume no gym equipment
- High BP → low-impact only, no inversions, no jumping
- Diabetes → moderate cardio + blood sugar diet focus
- Age 55+ → chair yoga, slow walks (10-15 min), balance exercises
- Age < 25 → moderate strength + cardio mix
- Diet suggestions: only common Indian ingredients (dal, sabzi, roti, curd, seasonal fruits)
- Never prescribe new medicines — only list existing ones as time reminders`],
  ["human", "Age: {age} yrs | Weight: {weight} kg | Height: {height} cm\nHealth conditions: {conditions}\n\nGenerate a 7-day wellness plan."],
]);

export async function runWellnessAgent({ profile, conditions }) {
  const chain = WELLNESS_PROMPT.pipe(makeLLM().withStructuredOutput(wellnessSchema));
  return chain.invoke({
    age: profile?.age || 30,
    weight: profile?.weight || 65,
    height: profile?.height || 165,
    conditions: conditions || "None mentioned",
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE — runTriagePipeline
// Orchestrates all agents with conditional routing and RunnableParallel
// ════════════════════════════════════════════════════════════════════════════

export async function runTriagePipeline(userId, userMessage, location, conversationHistory = []) {

  // Count how many times user has spoken (excluding the current message)
  const userTurns = conversationHistory.filter(m => m.role === 'user').length;

  // ── Step 1: Agent 1 — Intake ──────────────────────────────────────────────
  const intake = await callWithRetry(() => runIntakeAgent(userMessage, conversationHistory));
  intake.isComplete = intake.isComplete === true || intake.isComplete === "true";

  // Force complete after 2 user turns — never keep asking
  if (userTurns >= 2 && !intake.isComplete) {
    intake.isComplete = true;
    if (!intake.normalizedSymptoms) {
      // Build symptoms from all user messages as fallback
      const allUserMessages = [
        ...conversationHistory.filter(m => m.role === 'user').map(m => m.content),
        userMessage,
      ].join('. ');
      intake.normalizedSymptoms = allUserMessages;
    }
  }

  console.log('[Agent 1] isComplete:', intake.isComplete, '| language:', intake.language, '| userTurns:', userTurns);

  // ── Step 2: Incomplete symptoms → return follow-up, stop chain ────────────
  if (!intake.isComplete) {
    return {
      success: true,
      reply: intake.followUpQuestion || "Aapko kitne time se ye symptoms ho rahe hain? (How long have you had these symptoms?)",
      triage: null,
      agentStage: "intake",
      language: intake.language,
      predictedTitle: userMessage.substring(0, 40),
    };
  }

  // ── Step 3: Agent 2 — Memory (RAG) ────────────────────────────────────────
  const parallelStep = RunnableParallel.from({
    memory: new RunnableLambda({
      func: ({ userId, symptoms }) => runMemoryAgent({ userId, symptoms }),
    }),
  });

  const { memory: memoryResult } = await callWithRetry(() =>
    parallelStep.invoke({ userId, symptoms: intake.normalizedSymptoms })
  );

  // Agent 2 log is emitted inside fetchHistoryLambda

  // ── Step 4: Agent 3 — Triage ──────────────────────────────────────────────
  const triage = await callWithRetry(() => runTriageAgent({
    symptoms: intake.normalizedSymptoms,
    patientHistory: memoryResult.patientHistory,
    language: intake.language,
  }));

  console.log('[Agent 3] Triage result:', triage.urgency);

  // ── Step 5: Agent 4 — Matching (only for YELLOW and RED) ─────────────────
  let matchResult = { hospitals: [], recommendedFilter: null };
  if (triage.urgency !== "GREEN") {
    matchResult = await runMatchingAgent({
      urgency: triage.urgency,
      location,
      specialistNeeded: triage.specialist_needed,
    });
  }

  // ── Step 6: Return combined pipeline output ───────────────────────────────
  return {
    success: true,
    reply: triage.assessment,
    triage,
    hospitals: matchResult.hospitals,
    agentStage: "complete",
    language: intake.language,
    predictedTitle: userMessage.substring(0, 40),
  };
}
