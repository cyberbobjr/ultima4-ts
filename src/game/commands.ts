// Command registry: every key command of the game, by context. Modules register their commands
// (magic.ts: C)ast, M)ix; items.ts: U)se, S)earch...) instead of filling handler slots on Game,
// and the same list drives the help panel and the command bar.
import type { Game } from "./game";
import type { CombatApi } from "./combat";

export type CommandContext = "world" | "town" | "dungeon" | "combat";

/** What a command runs with: the game, where it is used, and the combat state in a fight. */
export interface CommandEnv {
  g: Game;
  ctx: CommandContext;
  /** Combat only: the acting member's API. */
  combat?: CombatApi;
  /** Combat only: context for U)se (stones at altar rooms, the skull). */
  use?: UseEnv;
}

/** U)se during a member's combat turn (set by combat.ts, read by items.ts). */
export interface UseEnv {
  pos: { x: number; y: number };
  /** Altar of a dungeon altar room (0 Truth, 1 Love, 2 Courage; DS:943E), -1 elsewhere. */
  altar: number;
  /** The fight is in a dungeon room (mode 6). */
  room: boolean;
  /** Kills every monster except Lord British (skull used in combat). */
  killAll: () => void;
}

export interface Command {
  /** Key as in the original (lower case letter, " " for pass). */
  key: string;
  /** Stable id, used for the labels of the help and the command bar (ui catalog "cmd.<id>"). */
  id: string;
  contexts: readonly CommandContext[];
  run(env: CommandEnv): Promise<void> | void;
}

export class CommandRegistry {
  private list: Command[] = [];

  register(...cmds: Command[]): void {
    for (const c of cmds) {
      for (const ctx of c.contexts)
        if (this.get(c.key, ctx)) throw new Error(`command ${c.key} already registered for ${ctx}`);
      this.list.push(c);
    }
  }

  get(key: string, ctx: CommandContext): Command | undefined {
    const k = key.length === 1 ? key.toLowerCase() : key;
    return this.list.find((c) => c.key === k && c.contexts.includes(ctx));
  }

  /** Commands available in a context, in key order (help panel, command bar). */
  forContext(ctx: CommandContext): Command[] {
    return this.list.filter((c) => c.contexts.includes(ctx)).sort((a, b) => a.key.localeCompare(b.key));
  }
}

/** Every overworld/town command ends the turn (1000:1C06); combat and dungeon loops do their own. */
export const endsTurn = (env: CommandEnv) => { if (env.ctx === "world" || env.ctx === "town") env.g.endTurn(); };
