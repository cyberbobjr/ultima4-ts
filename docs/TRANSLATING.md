# Translating the game

Two kinds of texts, two places:

| What | Where | Public? |
|---|---|---|
| Interface (menus, help, inventory, debug) | `src/i18n/ui/<lang>/*.json` | yes |
| Messages written for this port (not in the original) | `src/i18n/game/<lang>/*.json` | yes |
| Original game texts (AVATAR.EXE, TITLE.EXE) | `assets/i18n/<lang>/game.json` | **no** (derived from the game) |
| Original dialogues (`*.TLK`) | `assets/i18n/<lang>/talk/<town>.json` | **no** |
| Keyword glossary | `assets/i18n/<lang>/glossary.json` | **no** |

`assets/original/i18n/en/game.json` (produced by `npm run extract`) is the reference: the translated
`game.json` has the same keys. A missing key falls back to English.

Dialogue files have the same shape as `assets/original/talk/<town>.json` (an array of 16 entries, `null`
for empty slots); each entry may give any of the text fields (`name`, `pronoun`, `look`, `job`, `health`,
`response1`, `response2`, `question`, `yes`, `no`, `keyword1`, `keyword2`). Missing fields keep the original.

## Rules

- **Control characters stay**: `\n` line breaks, `\u0012` (printed as a blank) and `\b` (back one column)
  in prompts such as `"Who:\u0012\u0012\b"` — keep them at the same place.
- **Pieces stay pieces**: many messages are printed in several parts (`"\nAttacked by "` + monster name,
  `" says: I am "` + name). Keep the leading/trailing spaces and newlines; translate so that the
  concatenation reads correctly.
- **Pre-wrapped texts**: texts printed without word wrap (Lord British's answers `town.lb.*`, and any text
  whose lines are already cut with `\n` every ≤ 16 characters) must keep lines of **16 characters at most**.
  The console is 16 columns wide; other texts are wrapped automatically.
- **Never translate**: mantras (`ahm`, `mu`, `ra`, `beh`, `cah`, `summ`, `om`, `lum`), the word of passage,
  proper names of people and places (Britannia, Lord British, Moonglow…), monster and spell names may be
  translated but must then be consistent everywhere.
- **Keywords**: the player types a word, the game compares its **first 4 letters** (case and accents are
  ignored). So:
  - every translated keyword must be at least 4 letters when possible, and its first 4 letters must
    differ from the other words that NPC understands (the topic words `name`, `look`, `job`, `health`,
    `join`, `give`, `bye` in their translated form, and its two keywords);
  - a keyword mentioned by another NPC ("ask about the *bell*") must be translated the same way: use
    the glossary for every keyword and every word that points to one;
  - lists the player can type (topic words, Lord British's keywords, tavern topics, item names for U)se,
    virtues at the shrines, stone colours…) are translated through the glossary too.
- Tone: the archaic, solemn style of the original ("thou", "thee" → "tu"/"toi" in French, a slightly old
  vocabulary), concise.
