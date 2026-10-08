// LLM conversation provider (prepared, not enabled yet).
//
// Contract, so that it can be plugged in without touching the engine:
// - the system prompt is built from the NPC profile (TLK name, look, job, health, keywords and
//   their answers, the place) and asks the model to stay in character in Britannia;
// - the model must classify each input: when it is about one of the TLK topics (including the two
//   keywords) it returns that topic only, and the engine prints the exact TLK text — mantras,
//   places and passwords never come from the model;
// - otherwise it may return a short free answer (small talk), or nothing ("cannot help");
// - model, key and provider come from the configuration (config.llm).
// Until a client is written it answers like the original keyword matching.
import { config } from "../../config/config";
import type { ConversationProvider, NpcProfile } from "./provider";
import { tlkProvider } from "./tlk";

/** Text describing the NPC for the model's system prompt (topics are named so it can return them). */
export function npcBrief(npc: NpcProfile): string {
  const d = npc.dialogue;
  return [
    `You are ${d.name} in ${npc.place}, Britannia (Ultima IV). Pronoun: ${d.pronoun}.`,
    `Appearance (topic "look"): ${d.look}`,
    `Job (topic "job"): ${d.job}`,
    `Health (topic "health"): ${d.health}`,
    d.keyword1 && `Topic "keyword1" (${d.keyword1}): ${d.response1}`,
    d.keyword2 && `Topic "keyword2" (${d.keyword2}): ${d.response2}`,
  ].filter(Boolean).join("\n");
}

export const llmProvider: ConversationProvider = {
  id: "llm",
  async answer(npc, input, history) {
    const c = config().llm;
    if (!c.enabled || !c.apiKey) return tlkProvider.answer(npc, input, history);
    // Not implemented yet: same answers as the keyword matching.
    return tlkProvider.answer(npc, input, history);
  },
};

/** The provider selected by the configuration. */
export function conversationProvider(): ConversationProvider {
  return config().llm.enabled ? llmProvider : tlkProvider;
}
