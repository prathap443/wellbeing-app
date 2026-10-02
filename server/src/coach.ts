import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, type Context, type Profile, type Turn, describeUser } from './profile.js';

// Lowest-cost model by default. Set COACH_MODEL=claude-opus-5-5 for richer answers (about 4-8x the cost).
export const MODEL = process.env.COACH_MODEL || 'claude-haiku-4-5';
const IS_HAIKU = MODEL.startsWith('claude-haiku');

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// Frozen so it can be prompt-cached. Never interpolate per-user data here.
const SYSTEM_PROMPT = `You are the Wellbeing Coach inside "Wellbeing", a private self-care app. You help people understand their mood and take small, practical steps. You are warm, plain-spoken and brief, and you use British English.

How this app works:
- The person never types to you. They tap one of the questions you suggested, so every question is written in their voice ("Why do I...", "How can I...").
- You receive a short profile they chose from fixed options, plus mood and check-in data they logged in the app. Use it to personalise, but never recite it back or sound like you are reading a file.
- The app has these tools you can point to: breathe (box breathing), grounding (5-4-3-2-1 senses exercise), journal (guided reflection), checkin (sleep/energy/stress check-in), sleep_reset (wind-down routine), reach_out (message a trusted person), meditation (guided audio), anxiety_support (worry reset). Suggest one only when it genuinely fits.

Boundaries (always):
- You are not a therapist, doctor or crisis service. Do not diagnose, name disorders the person might have, or give advice on medication, dosages or stopping treatment.
- Use evidence-informed self-help ideas (CBT-style reframing, behavioural activation, sleep hygiene, self-compassion, grounding) explained simply, without jargon or technique names unless helpful.
- If the data or conversation suggests the person may be at risk of harming themselves or others, or is in crisis, set safety to "crisis", keep the answer short, caring and direct, and encourage contacting emergency services or a crisis line now. The app will show local numbers.
- If they seem to be struggling a lot for a while (e.g. many very bad days), set safety to "concern" and gently suggest talking to a GP or a professional alongside the app.
- Do not make promises, claim to remember past sessions beyond what is shown, or claim to be human.

Style:
- Answer in 2 short paragraphs at most (about 120 words). No headings, no bullet lists, no emoji.
- End with one small, concrete step they could take in the next few minutes or today.
- Match their preferred coaching style.`;

const SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: 'Five questions the person might want to ask, written in first person, each under 70 characters.',
      items: { type: 'string' },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string', description: 'The coaching reply shown to the person.' },
    follow_ups: {
      type: 'array',
      description: 'Three natural next questions in first person, each under 70 characters, that build on this answer.',
      items: { type: 'string' },
    },
    suggested_tool: { type: 'string', enum: [...TOOLS] },
    safety: { type: 'string', enum: ['none', 'concern', 'crisis'] },
  },
  required: ['answer', 'follow_ups', 'suggested_tool', 'safety'],
  additionalProperties: false,
};

export type CoachAnswer = {
  answer: string;
  follow_ups: string[];
  suggested_tool: (typeof TOOLS)[number];
  safety: 'none' | 'concern' | 'crisis';
};

/** Shown when the model declines. The question is refunded and crisis lines stay visible in the app. */
export const REFUSAL_FALLBACK: CoachAnswer & { refunded: true } = {
  answer: "I can't help with that one here. Try another question, and if you're struggling right now, the Get help button has people you can talk to.",
  follow_ups: [],
  suggested_tool: 'none',
  safety: 'none',
  refunded: true,
};

// USD per million tokens (input, output); see https://www.anthropic.com/pricing
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};

/** Logs token counts and estimated cost only; never content. */
function logUsage(usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }) {
  const [inPrice, outPrice] = PRICES[MODEL] ?? [0, 0];
  const input = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  const cost = (input * inPrice + usage.output_tokens * outPrice) / 1_000_000;
  console.log(`usage: ${input} in / ${usage.output_tokens} out ≈ $${cost.toFixed(4)}`);
}

async function callClaude(userContent: string, schema: Record<string, unknown>, effort: 'low' | 'medium') {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContent }],
    // Haiku 4.5 does not accept effort or server-side fallbacks.
    ...(IS_HAIKU
      ? { output_config: { format: { type: 'json_schema' as const, schema } } }
      : {
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default' as const,
          output_config: { effort, format: { type: 'json_schema' as const, schema } },
        }),
  });

  logUsage(response.usage);
  if (response.stop_reason === 'refusal') return { refused: true as const };
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error(`No text in response (stop_reason=${response.stop_reason})`);
  return { refused: false as const, json: JSON.parse(text.text) as unknown };
}

const shortQuestions = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((q): q is string => typeof q === 'string').map((q) => q.trim()).filter((q) => q.length > 0 && q.length <= 90).slice(0, max)
    : [];

export async function suggestQuestions(profile: Profile, context: Context): Promise<string[]> {
  const result = await callClaude(
    `<person>\n${describeUser(profile, context)}\n</person>\n\nSuggest five questions this person would find most useful to ask you right now. Base them on their focus areas, how they react to stress, and especially any pattern in their recent moods or check-in (for example a dip, poor sleep or high stress). Make them specific to this person, varied, and not alarming. Include at most one about something going well.`,
    SUGGESTIONS_SCHEMA,
    'low',
  );
  if (result.refused) return [];
  return shortQuestions((result.json as { questions?: unknown }).questions, 5);
}

export async function answerQuestion(profile: Profile, context: Context, history: Turn[], question: string): Promise<CoachAnswer & { refunded?: true }> {
  const earlier = history.length
    ? `<earlier_in_this_session>\n${history.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join('\n\n')}\n</earlier_in_this_session>\n\n`
    : '';
  const result = await callClaude(
    `<person>\n${describeUser(profile, context)}\n</person>\n\n${earlier}<question>${question}</question>`,
    ANSWER_SCHEMA,
    'medium',
  );
  if (result.refused) return REFUSAL_FALLBACK;
  const json = result.json as Partial<CoachAnswer>;
  const answer = typeof json.answer === 'string' ? json.answer.trim() : '';
  if (!answer) throw new Error('Empty answer');
  return {
    answer,
    follow_ups: shortQuestions(json.follow_ups, 3),
    suggested_tool: (TOOLS as readonly string[]).includes(json.suggested_tool as string) ? json.suggested_tool! : 'none',
    safety: json.safety === 'crisis' || json.safety === 'concern' ? json.safety : 'none',
  };
}
