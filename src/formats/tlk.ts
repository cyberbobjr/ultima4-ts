// *.TLK: 16 records of 288 bytes.
// byte 0: which topic asks the question (3=job, 4=health, 5=keyword1, 6=keyword2)
// byte 1: answering "yes" is the humble answer  byte 2: chance (/256) of turning away
// then NUL-terminated strings.
export interface Dialogue {
  questionTrigger: number;
  humilityTest: boolean;
  turnAwayProb: number;
  name: string; pronoun: string; look: string; job: string; health: string;
  response1: string; response2: string;
  question: string; yes: string; no: string;
  keyword1: string; keyword2: string;
}

export function decodeTalk(src: Uint8Array): (Dialogue | null)[] {
  const out: (Dialogue | null)[] = [];
  for (let i = 0; i + 288 <= src.length; i += 288) {
    const rec = src.subarray(i, i + 288);
    const strings: string[] = [];
    let cur = "";
    for (let k = 3; k < 288 && strings.length < 12; k++) {
      if (rec[k] === 0) { strings.push(cur); cur = ""; } else cur += String.fromCharCode(rec[k]);
    }
    if (!strings[0]) { out.push(null); continue; }
    const [name, pronoun, look, job, health, response1, response2, question, yes, no, keyword1, keyword2] = strings;
    out.push({
      questionTrigger: rec[0], humilityTest: rec[1] !== 0, turnAwayProb: rec[2],
      name, pronoun, look, job, health, response1, response2, question, yes, no,
      keyword1: (keyword1 ?? "").trim(), keyword2: (keyword2 ?? "").trim(),
    });
  }
  return out;
}
