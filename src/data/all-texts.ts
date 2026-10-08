// Loads every module that declares game texts, so the text registry is complete
// (used by the extractor and the tests; the engine imports these modules anyway).
import "../game/town/strings";
import "../intro/texts";
import "./tables";
import "../dungeon/tables";
import "../game/locations";
import "../game/texts/core";
import "../game/texts/fight";
import "../game/texts/magic";
import "../game/texts/town";
import "../game/texts/intro";
