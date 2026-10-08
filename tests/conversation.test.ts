import { beforeAll, describe, expect, it } from "vitest";
import { tlkProvider } from "../src/game/conversation/tlk";
import type { NpcProfile } from "../src/game/conversation/provider";
import { setGameText } from "../src/data/text";

// the keyword table words (DS:0x2A90) come from the game catalog
beforeAll(() => setGameText({
  "msg.town.topicBye": "bye", "msg.town.topicName": "name", "msg.town.topicLook": "look", "msg.town.topicJob": "job",
  "msg.town.topicHealth": "health", "msg.town.topicJoin": "join", "msg.town.topicGive": "give",
}));

const npc: NpcProfile = {
  place: "Testville", tile: 0x52,
  dialogue: {
    questionTrigger: 5, humilityTest: false, turnAwayProb: 0,
    name: "Tester", pronoun: "He", look: "a test", job: "testing", health: "fine",
    response1: "r1", response2: "r2", question: "q?", yes: "y", no: "n",
    keyword1: "RUNE", keyword2: "",
  },
};
const topic = async (input: string) => (await tlkProvider.answer(npc, input, [])).topic;

describe("TLK conversation provider (1000:A4B4 keyword table)", () => {
  it("matches the first 4 letters, case-insensitively", async () => {
    expect(await topic("job")).toBe("job");
    expect(await topic("HEALTHY")).toBe("health");
    expect(await topic("runes")).toBe("keyword1");
    expect(await topic("bye")).toBe("bye");
  });
  it("stops at an empty keyword (entries after it are unreachable)", async () => {
    expect(await topic("join")).toBe(null);
    expect(await topic("give")).toBe(null);
  });
  it("answers nothing for unknown words", async () => {
    expect(await topic("dragons")).toBe(null);
  });
});
