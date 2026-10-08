// The original keyword matching (1000:A4B4): the first 4 letters of the input against the keyword
// table DS:0x2A90, whose entries 5 and 6 are the NPC's two TLK keywords.
import { strnieq } from "../prompts";
import { MSG_TOWN } from "../texts/town";
import { TOPICS, type ConversationProvider, type Reply, type Topic } from "./provider";

export const tlkProvider: ConversationProvider = {
  id: "tlk",
  async answer(npc, input): Promise<Reply> {
    const d = npc.dialogue;
    const words: Record<Topic, string> = {
      bye: MSG_TOWN.topicBye, name: MSG_TOWN.topicName, look: MSG_TOWN.topicLook, job: MSG_TOWN.topicJob,
      health: MSG_TOWN.topicHealth, keyword1: d.keyword1, keyword2: d.keyword2, join: MSG_TOWN.topicJoin,
      give: MSG_TOWN.topicGive,
    };
    // an empty keyword ends the table, as in the original
    for (const t of TOPICS) {
      if (!words[t]) break;
      if (strnieq(words[t], input, 4)) return { topic: t };
    }
    return { topic: null };
  },
};
