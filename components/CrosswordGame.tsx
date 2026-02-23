"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PuzzleResponse } from "@/app/api/puzzle/route";

type Dir = "across" | "down";

type Entry = {
  number: number;
  dir: Dir;
  row: number;
  col: number;
  startIndex: number;
  length: number;
  answer: string;
  clue: string;
};

const CELL_PX = 44;

const idx = (size: number, r: number, c: number) => r * size + c;
const rc = (size: number, i: number) => ({ r: Math.floor(i / size), c: i % size });
const isBlackChar = (ch: string) => ch === ".";

function safeCharAt(rows: string[], r: number, c: number) {
  const row = rows[r];
  if (!row) return ".";
  return row[c] ?? ".";
}

function computeNumbers(rows: string[], size: number) {
  const numbers = Array(size * size).fill(0);
  let n = 1;

  const isBlackAt = (r: number, c: number) => isBlackChar(safeCharAt(rows, r, c));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isBlackAt(r, c)) continue;

      const startsAcross = (c === 0 || isBlackAt(r, c - 1)) && c + 1 < size && !isBlackAt(r, c + 1);
      const startsDown = (r === 0 || isBlackAt(r - 1, c)) && r + 1 < size && !isBlackAt(r + 1, c);

      if (startsAcross || startsDown) numbers[idx(size, r, c)] = n++;
    }
  }

  return numbers;
}

function buildEntries(puzzle: PuzzleResponse) {
  const { size } = puzzle;

  const rows = puzzle.solutionRows.map((r) => (r.length >= size ? r.slice(0, size) : r.padEnd(size, ".")));

  const clueAcrossByNumber = new Map(puzzle.clues.across.map((c) => [c.number, c.clue]));
  const clueDownByNumber = new Map(puzzle.clues.down.map((c) => [c.number, c.clue]));

  const isBlackAt = (r: number, c: number) => isBlackChar(safeCharAt(rows, r, c));

  const numbers = computeNumbers(rows, size);
  const entries: Entry[] = [];

  function readAcross(startR: number, startC: number) {
    let c = startC;
    let s = "";
    while (c < size && !isBlackAt(startR, c)) {
      s += safeCharAt(rows, startR, c);
      c++;
    }
    return s;
  }

  function readDown(startR: number, startC: number) {
    let r = startR;
    let s = "";
    while (r < size && !isBlackAt(r, startC)) {
      s += safeCharAt(rows, r, startC);
      r++;
    }
    return s;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isBlackAt(r, c)) continue;

      const startIndex = idx(size, r, c);
      const number = numbers[startIndex];
      if (!number) continue;

      const startsAcross = (c === 0 || isBlackAt(r, c - 1)) && c + 1 < size && !isBlackAt(r, c + 1);
      const startsDown = (r === 0 || isBlackAt(r - 1, c)) && r + 1 < size && !isBlackAt(r + 1, c);

      if (startsAcross) {
        const answer = readAcross(r, c);
        const clue = clueAcrossByNumber.get(number) ?? "(No clue)";
        entries.push({ number, dir: "across", row: r, col: c, startIndex, length: answer.length, answer, clue });
      }
      if (startsDown) {
        const answer = readDown(r, c);
        const clue = clueDownByNumber.get(number) ?? "(No clue)";
        entries.push({ number, dir: "down", row: r, col: c, startIndex, length: answer.length, answer, clue });
      }
    }
  }

  entries.sort((a, b) => a.number - b.number || (a.dir === "across" ? -1 : 1));
  return { rows, numbers, entries };
}

function wordCellsFromStart(rows: string[], size: number, startIndex: number, dir: Dir) {
  const { r, c } = rc(size, startIndex);
  const cells: number[] = [];
  const isBlackAt = (rr: number, cc: number) => isBlackChar(safeCharAt(rows, rr, cc));

  if (dir === "across") {
    let cc = c;
    while (cc < size && !isBlackAt(r, cc)) {
      cells.push(idx(size, r, cc));
      cc++;
    }
  } else {
    let rr = r;
    while (rr < size && !isBlackAt(rr, c)) {
      cells.push(idx(size, rr, c));
      rr++;
    }
  }

  return cells;
}

export default function CrosswordGame() {
  const gridRef = useRef<HTMLDivElement>(null);

  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fill, setFill] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<Dir>("across");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/puzzle", { cache: "no-store" });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as PuzzleResponse;
        if (cancelled) return;

        setPuzzle(data);

        const size = data.size;
        const rows = data.solutionRows.map((r) => (r.length >= size ? r.slice(0, size) : r.padEnd(size, ".")));

        const initialFill: string[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            initialFill.push(isBlackChar(safeCharAt(rows, r, c)) ? "#" : "");
          }
        }

        setFill(initialFill);
        const firstOpen = initialFill.findIndex((v) => v !== "#");
        setActive(firstOpen >= 0 ? firstOpen : 0);
        setDir("across");
      } catch (e: any) {
        setLoadError(e?.message ?? "Failed to load puzzle");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const size = puzzle?.size ?? 0;

  const { rows, numbers, entries } = useMemo(() => {
    if (!puzzle) return { rows: [] as string[], numbers: [] as number[], entries: [] as Entry[] };
    return buildEntries(puzzle);
  }, [puzzle]);

  const acrossEntries = useMemo(() => entries.filter((e) => e.dir === "across"), [entries]);
  const downEntries = useMemo(() => entries.filter((e) => e.dir === "down"), [entries]);

  const solutionFlat = useMemo(() => {
    if (!puzzle) return [] as string[];
    const out: string[] = [];
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        out.push(safeCharAt(rows, r, c));
      }
    }
    return out;
  }, [puzzle, rows]);

  function focusGrid() {
    gridRef.current?.focus();
  }

  function findWordStartForCell(cellIndex: number, d: Dir) {
    const { r, c } = rc(size, cellIndex);
    const isBlackAt = (rr: number, cc: number) => isBlackChar(safeCharAt(rows, rr, cc));
    if (isBlackAt(r, c)) return cellIndex;

    if (d === "across") {
      let cc = c;
      while (cc > 0 && !isBlackAt(r, cc - 1)) cc--;
      return idx(size, r, cc);
    } else {
      let rr = r;
      while (rr > 0 && !isBlackAt(rr - 1, c)) rr--;
      return idx(size, rr, c);
    }
  }

  const activeWordStart = useMemo(() => {
    if (!puzzle) return 0;
    return findWordStartForCell(active, dir);
  }, [puzzle, active, dir, rows, size]);

  const activeEntry = useMemo(() => {
    if (!puzzle) return null;
    const list = dir === "across" ? acrossEntries : downEntries;
    return list.find((e) => e.startIndex === activeWordStart) ?? null;
  }, [puzzle, dir, acrossEntries, downEntries, activeWordStart]);

  const activeWordCells = useMemo(() => {
    if (!puzzle || !activeEntry) return new Set<number>();
    return new Set(wordCellsFromStart(rows, size, activeEntry.startIndex, activeEntry.dir));
  }, [puzzle, activeEntry, rows, size]);

  function isEntrySolved(e: Entry) {
    const cells = wordCellsFromStart(rows, size, e.startIndex, e.dir);
    for (const i of cells) {
      const sol = solutionFlat[i];
      if (sol === ".") return false;
      if (!fill[i]) return false;
      if (fill[i] !== sol) return false;
    }
    return true;
  }

  function tabToNextUnsolved() {
    if (!puzzle) return;

    const currentList = dir === "across" ? acrossEntries : downEntries;
    const otherList = dir === "across" ? downEntries : acrossEntries;

    const curStart = activeEntry?.startIndex ?? activeWordStart;
    const curIndex = currentList.findIndex((e) => e.startIndex === curStart);

    for (let i = Math.max(curIndex + 1, 0); i < currentList.length; i++) {
      if (!isEntrySolved(currentList[i])) {
        setDir(currentList[i].dir);
        setActive(currentList[i].startIndex);
        focusGrid();
        return;
      }
    }

    for (let i = 0; i < otherList.length; i++) {
      if (!isEntrySolved(otherList[i])) {
        setDir(otherList[i].dir);
        setActive(otherList[i].startIndex);
        focusGrid();
        return;
      }
    }

    const fallback = acrossEntries[0] ?? downEntries[0];
    if (fallback) {
      setDir(fallback.dir);
      setActive(fallback.startIndex);
      focusGrid();
    }
  }

  function move(dr: number, dc: number) {
    const { r, c } = rc(size, active);
    let nr = r + dr;
    let nc = c + dc;

    while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      const sol = safeCharAt(rows, nr, nc);
      if (!isBlackChar(sol)) {
        setActive(idx(size, nr, nc));
        return;
      }
      nr += dr;
      nc += dc;
    }
  }

  function stepForward() {
    if (dir === "across") move(0, 1);
    else move(1, 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!puzzle) return;

    if (e.key === "Tab") {
      e.preventDefault();
      tabToNextUnsolved();
      return;
    }

    const { r, c } = rc(size, active);
    if (isBlackChar(safeCharAt(rows, r, c))) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDir("across");
      move(0, -1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setDir("across");
      move(0, 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setDir("down");
      move(-1, 0);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDir("down");
      move(1, 0);
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setFill((prev) => {
        const next = [...prev];
        if (next[active] !== "#") next[active] = "";
        return next;
      });
      return;
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      setFill((prev) => {
        const next = [...prev];
        next[active] = letter;
        return next;
      });
      stepForward();
    }
  }

  function onCellClick(i: number) {
    if (!puzzle) return;
    const { r, c } = rc(size, i);
    if (isBlackChar(safeCharAt(rows, r, c))) return;

    if (i === active) setDir((d) => (d === "across" ? "down" : "across"));
    setActive(i);
    focusGrid();
  }

  function resetFill() {
    if (!puzzle) return;
    const initial: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        initial.push(isBlackChar(safeCharAt(rows, r, c)) ? "#" : "");
      }
    }
    setFill(initial);
    const firstOpen = initial.findIndex((v) => v !== "#");
    setActive(firstOpen >= 0 ? firstOpen : 0);
    setDir("across");
    focusGrid();
  }

  if (loadError) {
    return (
      <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.35)" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Puzzle failed to load</div>
        <div style={{ opacity: 0.9 }}>{loadError}</div>
      </div>
    );
  }

  if (!puzzle || fill.length === 0) {
    return <div style={{ opacity: 0.85 }}>Loading puzzle…</div>;
  }

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    padding: 14,
    background: "rgba(0,0,0,0.28)",
  };

  const clueRowStyle = (isActive: boolean, solved: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
    background: isActive ? "rgba(120, 90, 200, 0.22)" : "transparent",
    outline: isActive ? "1px solid rgba(120, 90, 200, 0.35)" : "none",
    opacity: solved ? 0.45 : 1,
    lineHeight: 1.25,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 440px", gap: 26, alignItems: "start" }}>
      {/* Grid */}
      <div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <button onClick={resetFill} style={btn}>Reset</button>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <strong>Tab</strong> = next unsolved clue (Across → Down → Across)
          </div>
        </div>

        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${size}, ${CELL_PX}px)`,
            outline: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {fill.map((val, i) => {
            const { r, c } = rc(size, i);
            const sol = safeCharAt(rows, r, c);
            const isBlk = isBlackChar(sol);
            const isActive = i === active;
            const inWord = activeWordCells.has(i);
            const num = numbers[i] ?? 0;

            return (
              <div
                key={i}
                onClick={() => onCellClick(i)}
                style={{
                  width: CELL_PX,
                  height: CELL_PX,
                  border: "1px solid rgba(0,0,0,0.35)",
                  background: isBlk ? "#0f0f12" : isActive ? "#3b2d5a" : inWord ? "#eadcff" : "#fff",
                  color: isBlk ? "#0f0f12" : "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  fontWeight: 900,
                  fontSize: 18,
                  userSelect: "none",
                  cursor: isBlk ? "default" : "pointer",
                }}
              >
                {!isBlk && num ? (
                  <span style={{ position: "absolute", top: 4, left: 6, fontSize: 10, fontWeight: 900, opacity: 0.7, lineHeight: 1 }}>
                    {num}
                  </span>
                ) : null}
                {!isBlk ? val : null}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.95 }}>
          {activeEntry ? (
            <>
              <strong>{activeEntry.dir.toUpperCase()} {activeEntry.number}:</strong> {activeEntry.clue}
            </>
          ) : (
            <span style={{ opacity: 0.8 }}>Click a square to start.</span>
          )}
        </div>
      </div>

      {/* Clues */}
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Clues</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={panelStyle}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Across</div>
            <div style={{ display: "grid", gap: 6 }}>
              {acrossEntries.map((e) => {
                const isActive = activeEntry?.startIndex === e.startIndex && dir === "across";
                const solved = isEntrySolved(e);
                return (
                  <div
                    key={`A-${e.number}-${e.startIndex}`}
                    onClick={() => {
                      setDir("across");
                      setActive(e.startIndex);
                      focusGrid();
                    }}
                    style={clueRowStyle(isActive, solved)}
                  >
                    <strong>{e.number}.</strong> {e.clue}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Down</div>
            <div style={{ display: "grid", gap: 6 }}>
              {downEntries.map((e) => {
                const isActive = activeEntry?.startIndex === e.startIndex && dir === "down";
                const solved = isEntrySolved(e);
                return (
                  <div
                    key={`D-${e.number}-${e.startIndex}`}
                    onClick={() => {
                      setDir("down");
                      setActive(e.startIndex);
                      focusGrid();
                    }}
                    style={clueRowStyle(isActive, solved)}
                  >
                    <strong>{e.number}.</strong> {e.clue}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Tip: click the active cell again to toggle direction.
        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  cursor: "pointer",
  fontWeight: 800,
  color: "#fff",
};