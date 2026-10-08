import { loadAssets } from "./render/assets";
import { Renderer } from "./render/renderer";
import { Game } from "./game/game";
import { Input } from "./game/input";
import { runIntro } from "./game/intro";
import { installMagic } from "./game/magic";
import { installItems } from "./game/items";
import { installShrine } from "./game/shrine";
import { setSeed } from "./game/rng";

async function main() {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  const assets = await loadAssets();
  const renderer = new Renderer(canvas, assets);
  const game = new Game(renderer, new Input());
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game; // used by automated tests
  installMagic(game);
  installItems(game);
  installShrine(game);

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
    (window as unknown as { __tick: (n?: number) => void }).__tick = (n = 1) => { for (let i = 0; i < n; i++) game.tick(); };
  } else setInterval(() => game.tick(), 250);

  // Dev shortcut for automated tests: ?skipintro starts directly from the original PARTY.SAV.
  const save = import.meta.env.DEV && location.search.includes("skipintro")
    ? (await import("./formats/save")).decodeSave(await (await import("./io/gamefs")).loadGameFile("PARTY.SAV"))
    : await runIntro(game);
  if (save.members === 0) { save.members = 1; save.players[0].name ||= "Avatar"; }
  game.overlay = null;
  await game.start(save);
}

main().catch((e) => {
  document.body.innerHTML = `<pre style="color:#f55;font:14px monospace;padding:1em">${String(e?.stack ?? e)}</pre>`;
});
