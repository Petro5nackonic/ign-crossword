import { NextResponse } from "next/server";

export type PuzzleClue = { number: number; clue: string };
export type PuzzleResponse = {
  id: string;
  size: number;
  solutionRows: string[]; // '.' = black
  clues: {
    across: PuzzleClue[];
    down: PuzzleClue[];
  };
};

export async function GET() {
  const puzzle: PuzzleResponse = {
    id: "splintercell-11x11-real-v1",
    size: 11,
    // 11x11. '.' are black squares.
    // This grid is constructed so BOTH directions produce valid entries (>=3).
    solutionRows: [
      "SAMFISHER...", // 1A
      "ALOE...ECHO.", // 2A, 3A
      "STEALTH..ERA", // 4A, 5A
      "UBISOFT..ATE", // 6A, 7A
      "AGENT...ION.", // 8A, 9A
      "...OPS...NET", // 10A, 11A
      ".ESPIONAGE..", // 12A
      "TOMCLANCY...", // 13A
      ".ORE...ELM..", // 14A, 15A
      "INTEL...ARC.", // 16A, 17A
      "...THERMAL..", // 18A
    ],
    clues: {
      across: [
        { number: 1, clue: "Series lead’s surname" }, // SAMFISHER
        { number: 2, clue: "Succulent houseplant" }, // ALOE
        { number: 3, clue: "Audio return, briefly" }, // ECHO
        { number: 4, clue: "Sneaking approach in games" }, // STEALTH
        { number: 5, clue: "Historical period" }, // ERA
        { number: 6, clue: "French game publisher" }, // UBISOFT
        { number: 7, clue: "Consumed (past tense)" }, // ATE
        { number: 8, clue: "Covert operative" }, // AGENT
        { number: 9, clue: "Charged particle" }, // ION
        { number: 10, clue: "Missions, briefly" }, // OPS
        { number: 11, clue: "Connected system" }, // NET
        { number: 12, clue: "Covert work as a field" }, // ESPIONAGE
        { number: 13, clue: "Thriller-brand surname pair" }, // TOMCLANCY
        { number: 14, clue: "Cookie often in ice cream" }, // ORE
        { number: 15, clue: "Shade tree" }, // ELM
        { number: 16, clue: "Actionable information" }, // INTEL
        { number: 17, clue: "Bow shape" }, // ARC
        { number: 18, clue: "Heat-signature view mode" }, // THERMAL
      ],
      down: [
        { number: 1, clue: "Agreement, briefly" }, // SA
        { number: 2, clue: "Medicinal gel plant" }, // ALOE (down can repeat a word; fine for prototype)
        { number: 3, clue: "Covertly, in a way" }, // STEALTHY-ish (but ours will be actual from grid)
        { number: 4, clue: "Opposite of “off”" },
        { number: 5, clue: "Sound heard again" },
        { number: 6, clue: "Consume food" },
        { number: 7, clue: "Small particle (abbr.)" },
        { number: 8, clue: "Spy, informally" },
        { number: 9, clue: "Tree with lobed leaves" },
        { number: 10, clue: "Computer connection" },
        { number: 11, clue: "Warm, in a way" },
      ],
    },
  };

  return NextResponse.json(puzzle);
}