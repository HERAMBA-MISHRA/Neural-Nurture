/**
 * Mock AI responses — realistic enough for a full demo.
 * These are NOT throwaway code. They are the fallback when Claude key is absent.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectLang(text) {
  if (/[^\x00-\x7F]/.test(text)) return 'hindi';
  const hindiWords = ['dard', 'bukhar', 'sir', 'seena', 'pet', 'khana', 'pani', 'thakaan', 'neend', 'sar', 'badan'];
  const lower = text.toLowerCase();
  const hindiCount = hindiWords.filter(w => lower.includes(w)).length;
  return hindiCount >= 2 ? 'hinglish' : 'english';
}

function detectUrgency(text) {
  const t = text.toLowerCase();
  const red = ['chest pain', 'seena dard', 'heart attack', 'breathless', 'saans nahi', 'unconscious', 'stroke', 'paralysis', 'severe bleeding', 'tez dard', 'coma', 'fits', 'seizure', 'emergency'];
  const yellow = ['fever', 'bukhar', 'vomiting', 'ulti', 'diarrhea', 'infection', 'persistent', '3 day', '3 din', 'week', 'hafte', 'headache', 'sir dard', 'pain', 'dard', 'cold', 'cough', 'khansi', 'throat', 'gala', 'rash', 'allergy'];
  if (red.some(w => t.includes(w))) return 'red';
  if (yellow.some(w => t.includes(w))) return 'yellow';
  return 'green';
}

function urgencyReplyHint(urgency, lang) {
  if (urgency === 'red') {
    return lang === 'hindi' || lang === 'hinglish'
      ? '🚨 Yeh ek serious situation hai. Abhi turant nearest emergency room ya 108 call karein. Main aapko sab steps bata raha hoon.'
      : '🚨 This sounds serious. Please go to the emergency room immediately or call 108 (ambulance). Sharing first-response steps now.';
  }
  if (urgency === 'yellow') {
    return lang === 'hindi' || lang === 'hinglish'
      ? 'Aapke symptoms ko dekhte hue doctor se milna zaroori lagta hai. Ghabrao mat — main aapko guide karoonga.'
      : 'Based on your symptoms, a doctor visit is advisable. No need to panic — let me guide you through next steps.';
  }
  return lang === 'hindi' || lang === 'hinglish'
    ? 'Yeh symptoms mild lagte hain. Ghar pe care se theek ho sakta hai. Main aapko sahi steps bata raha hoon.'
    : 'These symptoms appear mild and manageable at home. Let me give you clear care steps.';
}

// ─── Agent-specific mocks ─────────────────────────────────────────────────

function mockIntake({ messages }) {
  const last = (messages.at(-1)?.content || '').toLowerCase();
  const lang = detectLang(last);

  const followUps = {
    english: [
      'Thank you for sharing that. Can you tell me: how many days have you been feeling this way, and is the discomfort constant or does it come and go?',
      'I want to make sure I understand correctly. On a scale of 1 to 10, how would you rate your discomfort right now? And do you have any pre-existing conditions like diabetes or BP?',
      'One more thing — have you taken any medicine for this so far? And does it feel better or worse after meals?',
    ],
    hinglish: [
      'Dhanyawad batane ke liye. Kya aap bata sakte hain: yeh problem kitne dino se hai, aur kya dard baar baar aata hai ya hamesha rehta hai?',
      'Thoda aur samajhne ke liye — 1 se 10 mein, aapka dard abhi kitna hai? Aur kya aapko pehle se koi bimari hai jaise diabetes ya BP?',
      'Ek aur sawaal — kya aapne koi dawai li hai iske liye? Aur khaane ke baad behtar lagta hai ya bura?',
    ],
  };

  const pool = lang === 'english' ? followUps.english : followUps.hinglish;
  const msgCount = messages.filter(m => m.role === 'user').length;
  return pool[Math.min(msgCount - 1, pool.length - 1)];
}

function mockTriage({ messages }) {
  const last = messages.at(-1)?.content || '';
  const urgency = detectUrgency(last);
  const lang = detectLang(last);

  const triageMap = {
    red: {
      assessment: urgencyReplyHint('red', lang),
      urgency: 'RED',
      reasoning: 'Symptoms indicate a potentially life-threatening condition requiring immediate emergency care.',
      likely_cause: 'Acute Cardiac / Respiratory Emergency',
      specialist_needed: 'Emergency Medicine',
      home_care: [
        '📞 Call 108 (ambulance) or have someone drive you to the ER immediately',
        '🛑 Do not eat or drink anything — you may need surgery',
        '🧘 Stay calm and sit upright, do not lie flat',
        '💊 If you have prescribed nitroglycerine or aspirin, take it now',
        '📍 Tell someone your exact location',
      ],
      redFlags: ['Chest pain radiating to arm/jaw', 'Sudden shortness of breath', 'Loss of consciousness', 'One-sided weakness'],
      whenToSeekHelp: 'IMMEDIATELY — do not wait',
    },
    yellow: {
      assessment: urgencyReplyHint('yellow', lang),
      urgency: 'YELLOW',
      reasoning: 'Symptoms are moderate and require a professional evaluation within 24 hours.',
      likely_cause: 'Viral / Bacterial Infection — likely Upper Respiratory or Gastroenteritis',
      specialist_needed: 'General Practitioner',
      home_care: [
        '🌡️ Monitor your temperature every 4 hours — if above 103°F (39.4°C), go to ER',
        '💧 Drink at least 2.5L of fluids (ORS, coconut water, or plain water)',
        '🍽️ Eat light, easily digestible food — dal khichdi, curd rice, bananas',
        '💊 You may take Paracetamol (Crocin 650mg) for fever — max 3 times a day',
        '🛌 Rest completely — no strenuous activity',
        '🚫 Avoid cold drinks, fried food, and dairy until symptoms resolve',
      ],
      redFlags: ['Fever above 103°F', 'Blood in stool or vomit', 'Inability to keep fluids down for 6+ hours', 'Severe abdominal pain'],
      whenToSeekHelp: 'Within 24 hours, or immediately if red flags appear',
    },
    green: {
      assessment: urgencyReplyHint('green', lang),
      urgency: 'GREEN',
      reasoning: 'Symptoms are mild and consistent with common self-resolving conditions.',
      likely_cause: 'Common Cold / Tension Headache / Mild Dehydration',
      specialist_needed: 'No specialist needed — General Practitioner if persists',
      home_care: [
        '💧 Increase water intake to 2.5–3L per day',
        '🛌 Ensure 7–8 hours of uninterrupted sleep',
        '🌶️ Avoid spicy, oily, or heavily processed food for 2 days',
        '🍵 Warm ginger-tulsi tea (adrak-tulsi chai) helps with mild cold and headache',
        '🧘 Light breathing exercises or a 10-minute walk can reduce tension headache',
        '📱 If symptoms persist beyond 3 days, consult a doctor',
      ],
      redFlags: ['Fever developing', 'Symptoms worsening after 48 hours', 'New symptoms appearing'],
      whenToSeekHelp: 'Only if symptoms persist beyond 3 days or worsen',
    },
  };

  return JSON.stringify(triageMap[urgency]);
}

function mockDietPlan({ messages, system }) {
  const allText = system + ' ' + messages.map(m => m.content).join(' ');
  const budgetMatch = allText.match(/(\d+)/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : 100;

  const lowBudget = budget <= 80;

  const plan = {
    days: [
      {
        day: 'Monday',
        meals: [
          { type: 'Breakfast', name: 'Poha with Peanuts', description: 'Flattened rice cooked with onion, mustard seeds, curry leaves, peanuts. Light and energizing.', calories: 280, cost: Math.round(budget * 0.15) },
          { type: 'Lunch', name: lowBudget ? 'Dal Chawal' : 'Dal Makhani with Roti', description: lowBudget ? 'Yellow moong dal with steamed rice. Complete protein meal.' : 'Slow-cooked black lentils with 2 rotis. Rich in iron and protein.', calories: lowBudget ? 380 : 520, cost: Math.round(budget * 0.35) },
          { type: 'Dinner', name: 'Sabzi Roti', description: 'Seasonal vegetable curry (aloo-gobhi or palak) with 2 whole wheat rotis.', calories: 420, cost: Math.round(budget * 0.35) },
          { type: 'Snack', name: 'Banana + Curd', description: '1 banana + 100g curd. Probiotic and potassium boost.', calories: 150, cost: Math.round(budget * 0.1) },
        ],
      },
      {
        day: 'Tuesday',
        meals: [
          { type: 'Breakfast', name: 'Upma', description: 'Semolina cooked with vegetables and mustard tempering. Fiber-rich breakfast.', calories: 260, cost: Math.round(budget * 0.12) },
          { type: 'Lunch', name: 'Rajma Chawal', description: 'Kidney bean curry with steamed rice. High protein, iron-rich.', calories: 480, cost: Math.round(budget * 0.38) },
          { type: 'Dinner', name: 'Khichdi', description: 'Rice and moong dal cooked together with turmeric. Easy to digest.', calories: 360, cost: Math.round(budget * 0.33) },
          { type: 'Snack', name: 'Roasted Chana', description: '50g roasted chickpeas. High protein snack.', calories: 180, cost: Math.round(budget * 0.1) },
        ],
      },
      {
        day: 'Wednesday',
        meals: [
          { type: 'Breakfast', name: 'Idli with Sambar', description: '3 idlis with lentil sambar. Fermented, probiotic, low-fat.', calories: 290, cost: Math.round(budget * 0.15) },
          { type: 'Lunch', name: 'Chole Roti', description: 'Spiced chickpea curry with 2 whole wheat rotis. Complete protein.', calories: 510, cost: Math.round(budget * 0.38) },
          { type: 'Dinner', name: 'Mixed Vegetable Sabzi + Roti', description: 'Carrots, beans, potato with cumin-coriander gravy + 2 rotis.', calories: 400, cost: Math.round(budget * 0.33) },
          { type: 'Snack', name: 'Buttermilk (Chaas)', description: '1 glass diluted curd with cumin. Probiotic and cooling.', calories: 80, cost: Math.round(budget * 0.08) },
        ],
      },
      {
        day: 'Thursday',
        meals: [
          { type: 'Breakfast', name: 'Moong Dal Cheela', description: '2 green moong lentil pancakes with green chutney. High protein breakfast.', calories: 310, cost: Math.round(budget * 0.15) },
          { type: 'Lunch', name: 'Rice + Sambar + Papad', description: 'South Indian thali style lunch. Balanced macros.', calories: 460, cost: Math.round(budget * 0.35) },
          { type: 'Dinner', name: 'Palak Dal + Roti', description: 'Spinach lentil curry with 2 rotis. Iron and folate rich.', calories: 390, cost: Math.round(budget * 0.35) },
          { type: 'Snack', name: 'Seasonal Fruit', description: '1 apple or 1 guava. Vitamin C and fiber.', calories: 100, cost: Math.round(budget * 0.1) },
        ],
      },
      {
        day: 'Friday',
        meals: [
          { type: 'Breakfast', name: 'Atta Dosa + Coconut Chutney', description: 'Whole wheat dosa, crispy and light. Lower glycemic than maida.', calories: 270, cost: Math.round(budget * 0.14) },
          { type: 'Lunch', name: 'Kadhi Chawal', description: 'Yogurt-based curry with rice. Probiotic and comforting.', calories: 430, cost: Math.round(budget * 0.36) },
          { type: 'Dinner', name: 'Aloo Matar + Roti', description: 'Potato and pea curry with 2 rotis. Balanced and filling.', calories: 410, cost: Math.round(budget * 0.36) },
          { type: 'Snack', name: 'Milk + Haldi', description: '1 glass warm turmeric milk. Anti-inflammatory.', calories: 120, cost: Math.round(budget * 0.1) },
        ],
      },
      {
        day: 'Saturday',
        meals: [
          { type: 'Breakfast', name: 'Pohe + Chai', description: 'Classic Indore-style pohe with fennel seeds and lemon.', calories: 290, cost: Math.round(budget * 0.14) },
          { type: 'Lunch', name: 'Baingan Bharta + Dal + Roti', description: 'Roasted aubergine, lentil soup, 2 rotis. Complete nutrition.', calories: 490, cost: Math.round(budget * 0.38) },
          { type: 'Dinner', name: 'Rice Kheer (small) + Sabzi', description: 'Light dessert with vegetable curry. Weekend treat within budget.', calories: 380, cost: Math.round(budget * 0.33) },
          { type: 'Snack', name: 'Jaggery + Peanuts', description: '1 small piece gud with 20g peanuts. Iron + healthy fats.', calories: 160, cost: Math.round(budget * 0.1) },
        ],
      },
      {
        day: 'Sunday',
        meals: [
          { type: 'Breakfast', name: 'Besan Cheela + Dahi', description: '2 gram flour pancakes with a small bowl of curd.', calories: 330, cost: Math.round(budget * 0.15) },
          { type: 'Lunch', name: 'Dal + Rice + Fried Vegetable', description: 'Sunday special thali — dal, rice, and stir-fried seasonal vegetable.', calories: 510, cost: Math.round(budget * 0.38) },
          { type: 'Dinner', name: 'Light Khichdi', description: 'End the week light — moong rice khichdi with ghee. Easy to digest.', calories: 340, cost: Math.round(budget * 0.33) },
          { type: 'Snack', name: 'Green Tea + Murmura', description: '1 cup green tea + 1 cup puffed rice. Low calorie snack.', calories: 90, cost: Math.round(budget * 0.1) },
        ],
      },
    ],
    totalDailyBudget: budget,
    nutritionNotes: 'Plan uses whole grains, legumes, and seasonal vegetables — all available at any Indian kirana store. Adjust spice levels to taste.',
  };

  return JSON.stringify(plan);
}

function mockWellnessPlan({ system }) {
  const ageMatch = system.match(/age[:\s]+(\d+)/i);
  const weightMatch = system.match(/weight[:\s]+(\d+)/i);
  const age = ageMatch ? parseInt(ageMatch[1]) : 30;
  const isSenior = age >= 55;
  const isYoung = age <= 25;

  const plan = {
    planType: isSenior ? 'Low-Impact Senior Wellness' : isYoung ? 'Active Beginner Fitness' : 'Balanced Daily Wellness',
    weeklyGoal: isSenior ? 'Improve mobility, reduce joint stiffness, steady BP' : isYoung ? 'Build strength and stamina, improve focus' : 'Maintain weight, reduce stress, improve energy',
    days: [
      { day: 'Monday', activities: [{ name: 'Morning Walk', duration: isSenior ? 15 : 20, intensity: isSenior ? 'Low' : 'Moderate', instructions: 'Brisk walk outdoors. Inhale for 4 steps, exhale for 4 steps.' }, { name: isSenior ? 'Chair Yoga' : 'Sun Salutation (Surya Namaskar)', duration: isSenior ? 15 : 20, intensity: isSenior ? 'Low' : 'Moderate', instructions: isSenior ? '5 seated stretches — neck, shoulders, ankles.' : '6 rounds of Surya Namaskar at gentle pace.' }] },
      { day: 'Tuesday', activities: [{ name: 'Pranayama', duration: 15, intensity: 'Low', instructions: '5 min Anulom Vilom (alternate nostril) + 5 min Bhramari (humming breath) + 5 min Kapalbhati.' }, { name: isSenior ? 'Rest / Gentle Stretching' : 'Bodyweight Squats + Push-ups', duration: isSenior ? 10 : 20, intensity: isSenior ? 'Low' : 'Moderate', instructions: isSenior ? '5 gentle forward bends, seated.' : '3 sets of 10 squats + 3 sets of 5 push-ups.' }] },
      { day: 'Wednesday', activities: [{ name: 'Morning Walk', duration: isSenior ? 20 : 30, intensity: isSenior ? 'Low' : 'Moderate', instructions: 'Walk in a park if possible. Stop if any chest tightness.' }, { name: 'Meditation', duration: 10, intensity: 'Low', instructions: 'Sit comfortably, focus on breath. Use a guided meditation app if needed.' }] },
      { day: 'Thursday', activities: [{ name: 'Active Rest / Yoga Nidra', duration: 20, intensity: 'Low', instructions: 'Lie down in Shavasana. Practice body scan relaxation.' }] },
      { day: 'Friday', activities: [{ name: 'Morning Walk', duration: isSenior ? 15 : 25, intensity: isSenior ? 'Low' : 'Moderate', instructions: 'Slightly faster pace than Monday. Count your steps if possible.' }, { name: isSenior ? 'Balance Exercises' : 'Core Workout', duration: isSenior ? 15 : 20, intensity: isSenior ? 'Low' : 'Moderate', instructions: isSenior ? 'Stand on one foot for 10 seconds each side, 5 reps.' : 'Plank 30s + Bicycle crunches 15 reps x 3 sets.' }] },
      { day: 'Saturday', activities: [{ name: isSenior ? 'Swimming / Aqua Walk' : 'Cycling or Brisk Walk', duration: isSenior ? 30 : 40, intensity: 'Moderate', instructions: isSenior ? 'Pool walking is excellent for joint health.' : '30-minute moderate bike ride or fast walk.' }, { name: 'Stretching Cool-down', duration: 10, intensity: 'Low', instructions: 'Full body stretch. Hold each stretch for 20 seconds.' }] },
      { day: 'Sunday', activities: [{ name: 'Family Walk', duration: 20, intensity: 'Low', instructions: 'Leisurely walk with family/friends. Recovery day.' }, { name: 'Weekly Reflection', duration: 5, intensity: 'Low', instructions: 'Write down: 1 health win this week + 1 thing to improve next week.' }] },
    ],
  };

  return JSON.stringify(plan);
}

function mockHealthSummary({ system }) {
  const nameMatch = system.match(/name[:\s]+([A-Za-z\s]+)/i);
  const patientName = nameMatch ? nameMatch[1].trim() : 'Patient';

  const summary = {
    patientInfo: { name: patientName, age: '—', gender: '—' },
    overview: {
      status: 'Stable',
      analysis: `${patientName}'s health records show a pattern of mild to moderate acute illnesses managed with standard outpatient care. No chronic disease markers detected in current data. Overall trajectory is stable with good compliance to prescribed medications.`,
      clinicalTraj: 'Continue current wellness habits. Annual BP and blood sugar checks recommended given family history patterns in India.',
    },
    trends: [
      { topic: 'Respiratory', observation: 'Mild seasonal cough noted. No pneumonia or TB markers.', status: 'Positive' },
      { topic: 'Metabolic', observation: 'BMI appears within normal range. Hydration habits are good.', status: 'Positive' },
      { topic: 'Gastrointestinal', observation: 'Some food-related symptoms — likely dietary triggers.', status: 'Warning' },
    ],
    progress: {
      highlights: ['No hospitalizations in current record period', 'Good medication adherence based on prescription uploads', 'Regular wellness tracking noted'],
      concerns: ['Insufficient data for comprehensive chronic disease screening', 'Lab reports not yet uploaded — recommend CBC + lipid profile'],
    },
    recommendations: [
      { action: 'Upload CBC + Lipid Profile', priority: 'High', reason: 'Essential baseline for complete health picture — common preventable diseases detected early.' },
      { action: 'Annual health check-up', priority: 'Med', reason: 'Standard preventive care. Book within next 3 months.' },
      { action: 'Increase daily water intake', priority: 'Low', reason: 'Hydration logs show some days below recommended 2.5L.' },
    ],
  };

  return JSON.stringify(summary);
}

function mockMedicineExplain({ messages }) {
  const text = messages.at(-1)?.content || '';
  const t = text.toLowerCase();

  const medicines = {
    crocin: 'Crocin (Paracetamol) — bukhar aur dard ki common dawai hai. Ye brain ko dard ke signals reduce karne ka signal bhejti hai. Adult dose: 500–650mg, din mein maximum 3 baar. Khaane ke baad lein. Roz 3g se zyada mat lein.',
    paracetamol: 'Paracetamol — fever reducer and mild pain reliever. Safe for most adults. Dose: 500–1000mg every 6–8 hours. Maximum 4g per day. Always take after food.',
    azithromycin: 'Azithromycin — antibiotic for bacterial infections (throat, chest, ear). Take exactly as prescribed — complete the full course even if you feel better. Common for 3–5 days. Do not stop early or resistance builds.',
    metformin: 'Metformin — diabetes (madhumeh) ki pehli line dawai hai. Blood sugar ko control karti hai. Khaane ke sath lena zaroori hai — khali pet mat lo, acidity aur nausea hoti hai. Doctor ke bina band mat karo.',
    omeprazole: 'Omeprazole (Omez) — acidity aur stomach ulcer ki dawai. Khaane se 30 minute pehle lein, khaali pet. Usually morning mein. Long-term use se B12 ki kami ho sakti hai.',
    default: 'Is dawai ke baare mein detail jaankari ke liye apne doctor ya registered pharmacist se puchein. Medication ke baare mein AI se advice lena theek hai, lekin final decision doctor ka hona chahiye.',
  };

  const key = Object.keys(medicines).find(k => t.includes(k)) || 'default';
  return medicines[key];
}

function mockChatTip({ messages }) {
  const last = messages.at(-1)?.content || '';
  const lang = detectLang(last);
  const urgency = detectUrgency(last);

  if (urgency === 'red') {
    return lang === 'english'
      ? '🚨 Stay calm and breathe slowly. Do not exert yourself — get emergency help right away.'
      : '🚨 Shant rahein aur dheere saas lein. Turant kisi ko ambulance (108) bulane ko kahein.';
  }
  if (urgency === 'yellow') {
    return lang === 'english'
      ? '💧 Sip warm water with a small pinch of salt and sugar every hour — it helps most infections and keeps you hydrated.'
      : '💧 Har ghante thoda garam pani mein namak aur cheeni mila kar piyen — infection mein bahut fayda hota hai.';
  }
  return lang === 'english'
    ? '🍵 Rest and drink 2–3 glasses of warm water or ginger tea today — most mild symptoms resolve with hydration and rest.'
    : '🍵 Aaj 2–3 glass garam pani ya adrak wali chai piyen aur aram karein — halke symptoms aksar khud theek ho jaate hain.';
}

// ─── Main dispatcher ──────────────────────────────────────────────────────

export function getMockResponse({ system = '', messages = [], agentHint = null }) {
  const hint = agentHint || '';
  const sysLower = system.toLowerCase();

  if (hint === 'chat_tip') {
    return mockChatTip({ messages });
  }

  if (hint === 'intake' || sysLower.includes('intake') || sysLower.includes('follow-up question')) {
    return mockIntake({ messages });
  }

  if (hint === 'triage' || sysLower.includes('triage') || (sysLower.includes('green') && sysLower.includes('yellow') && sysLower.includes('red'))) {
    return mockTriage({ messages });
  }

  if (hint === 'diet' || sysLower.includes('diet') || sysLower.includes('meal plan') || sysLower.includes('ingredient') || sysLower.includes('budget')) {
    return mockDietPlan({ messages, system });
  }

  if (hint === 'wellness' || sysLower.includes('yoga') || sysLower.includes('exercise') || sysLower.includes('wellness plan') || sysLower.includes('workout')) {
    return mockWellnessPlan({ system });
  }

  if (hint === 'summary' || sysLower.includes('longitudinal') || sysLower.includes('health summary') || sysLower.includes('clinical history')) {
    return mockHealthSummary({ system });
  }

  if (hint === 'medicine' || sysLower.includes('medicine') || sysLower.includes('explain') || sysLower.includes('dawai')) {
    return mockMedicineExplain({ messages });
  }

  // Default: treat as triage
  return mockTriage({ messages });
}
