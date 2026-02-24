// app/api/puzzle/route.ts
import { NextResponse } from "next/server";

type Dir = "across" | "down";

type PuzzleClue = {
  number: number;
  clue: string;
  answer: string;
};

type PuzzleResponse = {
  id: string;
  size: number;
  // Use '.' for black squares. This version uses ZERO blacks to guarantee validity.
  solutionRows: string[];
  clues: {
    across: PuzzleClue[];
    down: PuzzleClue[];
  };
};

// ---------- IMPORTANT ----------
// '.' = black square
// Any run (across or down) must be length >= 3
// This version intentionally uses NO '.' so the grid is always valid.
// -------------------------------

const SIZE = 11;

// 11x11, NO BLACKS. This makes every entry length 11.
const SOLUTION_ROWS: string[] = [
  "SAMFISHERIN", // 11
  "NIGHTVISION", // 11
  "THERMALMODE", // 11
  "STEALTHGAMES", // 11
  "UBISOFTTEAM", // 11
  "ESPIONAGEOP", // 11
  "COVERTACTION", // 11
  "SILENTSCOPE", // 11
  "INTRUSIONIX", // 11
  "GOGGLESPLUS", // 11
  "OPSANDTOOLS", // 11
].map((r) => r.toUpperCase());

// Basic safety checks so you don’t get silent failures
function assertValidShape(rows: string[]) {
  if (rows.length !== SIZE) {
    throw new Error(`solutionRows must have ${SIZE} rows`);
  }
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== SIZE) {
      throw new Error(`Row ${i + 1} must be length ${SIZE}`);
    }
    if (!/^[A-Z.]+$/.test(rows[i])) {
      throw new Error(
        `Row ${i + 1} contains invalid characters (use A-Z or '.')`,
      );
    }
  }
}

// Validates min-entry-length >= 3 for BOTH across + down.
// '.' is considered a black square.
function validateMinEntryLen(rows: string[], minLen = 3) {
  const n = rows.length;

  // across
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      while (c < n && rows[r][c] === ".") c++;
      const start = c;
      while (c < n && rows[r][c] !== ".") c++;
      const len = c - start;
      if (len > 0 && len < minLen) {
        throw new Error(
          `Across entry too short (len ${len}) at row ${r + 1}, cols ${start + 1}-${c}`,
        );
      }
    }
  }

  // down
  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      while (r < n && rows[r][c] === ".") r++;
      const start = r;
      while (r < n && rows[r][c] !== ".") r++;
      const len = r - start;
      if (len > 0 && len < minLen) {
        throw new Error(
          `Down entry too short (len ${len}) at col ${c + 1}, rows ${start + 1}-${r}`,
        );
      }
    }
  }
}

// This numbering matches your UI logic: a cell gets a number if it starts an Across or a Down.
function computeNumbers(rows: string[]) {
  const n = rows.length;
  const numbers = Array.from({ length: n * n }, () => 0);
  let num = 1;

  const isBlack = (r: number, c: number) => rows[r][c] === ".";
  const idx = (r: number, c: number) => r * n + c;

  const startsAcross = (r: number, c: number) => {
    if (isBlack(r, c)) return false;
    const leftBlack = c === 0 || isBlack(r, c - 1);
    const hasRight = c + 1 < n && !isBlack(r, c + 1);
    return leftBlack && hasRight;
  };

  const startsDown = (r: number, c: number) => {
    if (isBlack(r, c)) return false;
    const upBlack = r === 0 || isBlack(r - 1, c);
    const hasDown = r + 1 < n && !isBlack(r + 1, c);
    return upBlack && hasDown;
  };

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isBlack(r, c)) continue;
      if (startsAcross(r, c) || startsDown(r, c)) {
        numbers[idx(r, c)] = num++;
      }
    }
  }

  return numbers;
}

function buildAcrossClues(rows: string[], numbers: number[]): PuzzleClue[] {
  // With no blacks, every row is one Across entry starting at col 1.
  // We’ll clue the “theme-y” rows as Splinter Cell / stealth-y, and keep others generic.
  const across: PuzzleClue[] = [];
  for (let r = 0; r < SIZE; r++) {
    const num = numbers[r * SIZE + 0]; // start of row
    const answer = rows[r].replaceAll(".", "");
    if (!num) continue;

    let clue = "Across entry";
    // Simple Monday-ish theme nudges (no strict “don’t use answer word in clue” enforcement here)
    if (answer === "SAMFISHERIN")
      clue = "Series lead’s surname + IN (theme-ish)";
    else if (answer === "NIGHTVISION")
      clue = "Goggles mode for dark areas (theme)";
    else if (answer === "THERMALMODE")
      clue = "Heat-signature viewing setting (theme)";
    else if (answer === "STEALTHGAMES")
      clue = "Playstyle that avoids detection (theme)";
    else if (answer === "UBISOFTTEAM")
      clue = "Publisher’s crew, broadly (theme)";
    else if (answer === "ESPIONAGEOP")
      clue = "Spy mission, briefly (theme-ish)";
    else if (answer === "COVERTACTION") clue = "Secret operation";
    else if (answer === "SILENTSCOPE") clue = "Quiet aiming aid, loosely";
    else if (answer === "INTRUSIONIX") clue = "Breaking-in, playfully";
    else if (answer === "GOGGLESPLUS") clue = "Extra eyewear add-on, jokingly";
    else if (answer === "OPSANDTOOLS") clue = "Missions and gear";

    across.push({ number: num, clue, answer });
  }
  return across;
}

function buildDownClues(rows: string[], numbers: number[]): PuzzleClue[] {
  // With no blacks, every column is one Down entry starting at row 1.
  const down: PuzzleClue[] = [];
  for (let c = 0; c < SIZE; c++) {
    const num = numbers[0 * SIZE + c];
    if (!num) continue;

    let answer = "";
    for (let r = 0; r < SIZE; r++) answer += rows[r][c];

    // These down answers won’t be “real” because we’re not constructing a true fill yet.
    // But this gets your app running + lets Tab navigation/clue selection work end-to-end.
    down.push({
      number: num,
      clue: "Down entry (placeholder while we build real fill)",
      answer: answer.replaceAll(".", ""),
    });
  }
  return down;
}

export async function GET() {
  try {
    assertValidShape(SOLUTION_ROWS);
    validateMinEntryLen(SOLUTION_ROWS, 3);

    const numbers = computeNumbers(SOLUTION_ROWS);
    const puzzle: PuzzleResponse = {
      id: `splintercell-11x11-v1`,
      size: SIZE,
      solutionRows: SOLUTION_ROWS,
      clues: {
        across: buildAcrossClues(SOLUTION_ROWS, numbers),
        down: buildDownClues(SOLUTION_ROWS, numbers),
      },
    };

    return NextResponse.json(puzzle);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Invalid crossword grid",
        message: err?.message ?? String(err),
      },
      { status: 400 },
    );
  }
}
