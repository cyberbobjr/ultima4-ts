// Messages of the town modules, by location in AVATAR.EXE (or port() for texts written for this port,
// in src/i18n/game/<lang>/town.json). See src/data/text.ts.
import { defineTexts } from "../../data/text";

export const MSG_TOWN = defineTexts("msg.town", {
  /**
   * 1000:A4B4: the conversation keyword table DS:0x2A90 holds (word, handler) pairs; these are its
   * words, in TOPICS order (entries 5 and 6, the TLK keywords, are filled at run time).
   */
  topicBye: 0x2a3e, topicName: 0x2a42, topicLook: 0x2a47, topicJob: 0x2a4c, topicHealth: 0x2a50,
  topicJoin: 0x2a57, topicGive: 0x2a5c,
  /** 1000:A4B4: articles that make the attacker rather than the NPC's name */
  articleA: 0x2c7e, articleThe: 0x2c81,
});
