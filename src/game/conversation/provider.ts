// Who answers the player in a conversation. The engine keeps the rules of the original dialogue
// (1000:A4B4: greeting, turning away, the NPC's question and its karma, joining, giving, "bye");
// a provider only decides what an input *means* and, optionally, how to phrase a free answer.
//
// Quest facts (mantras, places, passwords, the TLK keyword answers) must stay exact: when an input
// is about a TLK topic the provider returns that topic and the engine prints the TLK text itself.
// The keyword provider (tlk.ts) is the original behaviour; an LLM provider (llm.ts) can map free
// questions to these topics and answer small talk in character from the same profile.
import type { Dialogue } from "../../formats/tlk";

/** The topics of the original keyword table (DS:0x2A90), in its order. */
export const TOPICS = ["bye", "name", "look", "job", "health", "keyword1", "keyword2", "join", "give"] as const;
export type Topic = (typeof TOPICS)[number];

/** What a provider knows about the NPC: its TLK record plus where it lives. */
export interface NpcProfile {
  dialogue: Dialogue;
  /** Location name (town or castle). */
  place: string;
  /** Map tile of the NPC (its kind: guard, merchant, beggar...). */
  tile: number;
}

export interface ConversationTurn { input: string; topic: Topic | null; text: string }

export interface Reply {
  /** The TLK topic the input refers to, handled by the engine with the exact TLK text. */
  topic: Topic | null;
  /** Free answer when no topic applies (null: "That I cannot help thee with."). */
  text?: string | null;
}

export interface ConversationProvider {
  readonly id: string;
  /** Interprets one input of the player. `history` holds the earlier turns of this conversation. */
  answer(npc: NpcProfile, input: string, history: readonly ConversationTurn[]): Promise<Reply>;
}
