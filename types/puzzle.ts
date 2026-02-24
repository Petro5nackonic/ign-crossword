export type Dir = "across" | "down";

export type Clue = {
  number: number;
  dir: Dir;
  clue: string;
  answer?: string; // optional (you can omit for non-theme fill while prototyping)
  startIndex: number;
  length: number;
};

export type PuzzleResponse = {
  id: string;
  size: number;
  solutionRows: string[]; // use "#" for black squares, letters A-Z for fill, "." is NOT allowed here
  clues: {
    across: { number: number; clue: string; answer?: string }[];
    down: { number: number; clue: string; answer?: string }[];
  };
  // production-friendly: never hard-fail in the client; surface issues here
  warnings?: string[];
};
