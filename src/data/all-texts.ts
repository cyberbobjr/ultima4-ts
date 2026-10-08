// Loads every module that declares game texts, so the text registry is complete
// (used by the extractor and the tests; the engine imports these modules anyway).
import "../game/town/strings";
import "../intro/texts";
import "./tables";
import "../dungeon/tables";
import "../game/locations";
