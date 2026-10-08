import { loadAssets } from "./render/assets";
import { Renderer } from "./render/renderer";
import { Game } from "./game/game";
import { Input } from "./game/input";
import { runIntro } from "./game/intro";
import { installMagic } from "./game/magic";
import { installItems } from "./game/items";
import { setSeed } from "./game/rng";
import { advanceClock, useManualClock } from "./game/clock";
import { assets as store } from "./assets/store";
import { setGameText } from "./data/text";
import "./data/all-texts";
import { loadConfig } from "./config/config";

async function main() {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  if (!(await store.manifest())) throw new Error(
    "The game resources have not been extracted yet.\n\n" +
    "Run once, from the project folder:\n  npm run extract -- --game-dir \"<your Ultima IV install>\"\n\n" +
    "(default install: C:\\Program Files\\GOG Galaxy\\Games\\Ultima 4)");
  const cfg = await loadConfig();
  setGameText(await store.gameText(cfg.lang.game).catch(() => store.gameText("en")), await store.gameText("en"));
  const assets = await loadAssets();
  const renderer = new Renderer(canvas, assets);
  const game = new Game(renderer, new Input());
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game; // used by automated tests
  installMagic(game);
  installItems(game);

  const loop = () => {
    requestAnimationFrame(loop);
    try {
      game.draw();
      renderer.render();
    } catch (e) {
      console.error(e);
    }
  };
  requestAnimationFrame(loop);
  // Dev/tests: ?seed=N seeds the RNG and hands the 250 ms clock to the test driver (window.__tick).
  const seed = import.meta.env.DEV ? new URLSearchParams(location.search).get("seed") : null;
  if (seed !== null) {
    setSeed(Number(seed));
    useManualClock();
    (window as unknown as { __tick: (n?: number) => void }).__tick = (n = 1) => { for (let i = 0; i < n; i++) { game.tick(); advanceClock(250); } };
  } else setInterval(() => game.tick(), 250);

  // Dev shortcut for automated tests: ?skipintro starts directly from the original PARTY.SAV.
  const save = import.meta.env.DEV && location.search.includes("skipintro")
    ? (await store.originalSave() ?? await store.newParty())
    : await runIntro(game);
  if (save.members === 0) { save.members = 1; save.players[0].name ||= "Avatar"; }
  await game.start(save);
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="color:#f55;font:14px monospace;padding:1em">${String(e?.stack ?? e)}</pre>`;
});
