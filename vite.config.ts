import { defineConfig, type Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

// The original game data is never bundled: in dev/browser mode it is served
// from the user's install under /game/<FILE>; in Tauri it is read by the Rust side.
const GAME_DIR = process.env.U4_GAME_DIR ?? "C:/Program Files/GOG Galaxy/Games/Ultima 4";

function gameData(): Plugin {
  return {
    name: "u4-game-data",
    configureServer(server) {
      server.middlewares.use("/game/", (req, res) => {
        const name = decodeURIComponent((req.url ?? "").replace(/^\//, "").split("?")[0]);
        if (!/^[A-Za-z0-9_.]+$/.test(name)) { res.statusCode = 400; res.end(); return; }
        const file = path.join(GAME_DIR, name);
        fs.readFile(file, (err, data) => {
          if (err) { res.statusCode = 404; res.end(); return; }
          res.setHeader("Content-Type", "application/octet-stream");
          res.end(data);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [gameData()],
  clearScreen: false,
  // Cargo build artifacts are locked while compiling; watching them crashes Vite on Windows.
  server: { host: "127.0.0.1", port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  build: { target: "es2022" },
});
