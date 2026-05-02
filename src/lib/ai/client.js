import { getMockResponse } from './mock-responses';
import { ChatGroq } from "@langchain/groq";

export async function askAI({ system, messages, temperature = 0.3, agentHint = null }) {
  if (process.env.USE_MOCK_AI !== 'false') {
    return getMockResponse({ system, messages, agentHint });
  }

  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature,
  });

  const response = await llm.invoke([
    { role: 'system', content: system },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ]);

  return typeof response.content === 'string'
    ? response.content
    : response.content[0]?.text ?? '';
}
