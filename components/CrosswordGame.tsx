"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PuzzleResponse, Dir } from "@/types/puzzle";

type Entry = {
  dir: Dir;
  number: number;
  clue: string;
  cells: number[];
  answer: string;
};

const MIN_LEN = 3;

function idx(size: number, r: number, c: number) {
  return r * size + c;
}
function rc(size: number, i: number) {
  return { r: Math.floor(i / size), c: i % size };
}

export default function CrosswordGame() {
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [fill, setFill] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<Dir>("across");

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setApiError(null);

      try {
        const res = await fetch("/api/puzzle", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          const details = Array.isArray(data?.details)
            ? "\n\n" + data.details.join("\n")
            : "";
          throw new Error(`${data?.error || "API error"}${details}`);
        }

        // Hard schema check (prevents undefined crashes)
        if (
          !data ||
          typeof data.id !== "string" ||
          typeof data.size !== "number" ||
          !Array.isArray(data.solutionRows) ||
          !data.clues ||
          !Array.isArray(data.clues.across) ||
          !Array.isArray(data.clues.down)
        ) {
          throw new Error(
            "API returned a non-puzzle response. /api/puzzle must return { id, size, solutionRows, clues }.",
          );
        }

        const p = data as PuzzleResponse;

        if (cancelled) return;

        setPuzzle(p);

        // init fill
        const nextFill: string[] = [];
        for (let r = 0; r < p.size; r++) {
          for (let c = 0; c < p.size; c++) {
            const ch = p.solutionRows[r]?.[c] ?? ".";
            nextFill.push(ch === "." ? "#" : "");
          }
        }
        setFill(nextFill);

        const first = nextFill.findIndex((v) => v !== "#");
        setActive(first >= 0 ? first : 0);
        setDir("across");
      } catch (e: any) {
        if (cancelled) return;
        setPuzzle(null);
        setFill([]);
        setApiError(e?.message || "Failed to load puzzle");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const size = puzzle?.size ?? 0;
  const solutionRows = puzzle?.solutionRows ?? [];

  const isBlack = (r: number, c: number) => {
    const ch = solutionRows[r]?.[c] ?? ".";
    return ch === ".";
  };

  const numbers = useMemo(() => {
    if (!puzzle) return [];
    const nums = Array.from({ length: size * size }, () => 0);
    let n = 1;

    const startsAcross = (r: number, c: number) => {
      if (isBlack(r, c)) return false;
      const leftBlack = c === 0 || isBlack(r, c - 1);
      const hasRight = c + 1 < size && !isBlack(r, c + 1);
      return leftBlack && hasRight;
    };
    const startsDown = (r: number, c: number) => {
      if (isBlack(r, c)) return false;
      const upBlack = r === 0 || isBlack(r - 1, c);
      const hasDown = r + 1 < size && !isBlack(r + 1, c);
      return upBlack && hasDown;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isBlack(r, c)) continue;
        if (startsAcross(r, c) || startsDown(r, c)) nums[idx(size, r, c)] = n++;
      }
    }
    return nums;
  }, [puzzle, size, solutionRows]);

  const entries = useMemo<Entry[]>(() => {
    if (!puzzle) return [];

    const acrossClue = new Map(
      puzzle.clues.across.map((x) => [x.number, x.clue]),
    );
    const downClue = new Map(puzzle.clues.down.map((x) => [x.number, x.clue]));

    const out: Entry[] = [];

    const startsAcross = (r: number, c: number) => {
      if (isBlack(r, c)) return false;
      const leftBlack = c === 0 || isBlack(r, c - 1);
      const hasRight = c + 1 < size && !isBlack(r, c + 1);
      return leftBlack && hasRight;
    };
    const startsDown = (r: number, c: number) => {
      if (isBlack(r, c)) return false;
      const upBlack = r === 0 || isBlack(r - 1, c);
      const hasDown = r + 1 < size && !isBlack(r + 1, c);
      return upBlack && hasDown;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!startsAcross(r, c)) continue;

        const number = numbers[idx(size, r, c)];
        const cells: number[] = [];
        let answer = "";
        let cc = c;
        while (cc < size && !isBlack(r, cc)) {
          cells.push(idx(size, r, cc));
          answer += solutionRows[r][cc];
          cc++;
        }
        if (cells.length >= MIN_LEN) {
          out.push({
            dir: "across",
            number,
            clue: acrossClue.get(number) ?? "(No clue)",
            cells,
            answer,
          });
        }
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!startsDown(r, c)) continue;

        const number = numbers[idx(size, r, c)];
        const cells: number[] = [];
        let answer = "";
        let rr = r;
        while (rr < size && !isBlack(rr, c)) {
          cells.push(idx(size, rr, c));
          answer += solutionRows[rr][c];
          rr++;
        }
        if (cells.length >= MIN_LEN) {
          out.push({
            dir: "down",
            number,
            clue: downClue.get(number) ?? "(No clue)",
            cells,
            answer,
          });
        }
      }
    }

    out.sort((a, b) =>
      a.dir === b.dir ? a.number - b.number : a.dir === "across" ? -1 : 1,
    );
    return out;
  }, [puzzle, size, solutionRows, numbers]);

  const acrossEntries = useMemo(
    () => entries.filter((e) => e.dir === "across"),
    [entries],
  );
  const downEntries = useMemo(
    () => entries.filter((e) => e.dir === "down"),
    [entries],
  );

  const activeEntry = useMemo(() => {
    if (!puzzle || fill[active] === "#") return null;
    return (
      entries.find((e) => e.dir === dir && e.cells.includes(active)) ?? null
    );
  }, [puzzle, fill, active, dir, entries]);

  const activeWordCells = useMemo(() => {
    const set = new Set<number>();
    if (!activeEntry) return set;
    for (const c of activeEntry.cells) set.add(c);
    return set;
  }, [activeEntry]);

  function focusGrid() {
    gridRef.current?.focus();
  }

  function entrySolved(e: Entry) {
    for (let i = 0; i < e.cells.length; i++) {
      const cell = e.cells[i];
      const typed = fill[cell];
      const want = e.answer[i];
      if (!typed || typed !== want) return false;
    }
    return true;
  }

  function jumpToEntry(e: Entry) {
    setDir(e.dir);
    setActive(e.cells[0]);
    focusGrid();
  }

  function nextUnsolvedFrom(current: Entry | null, target: Dir) {
    const list = target === "across" ? acrossEntries : downEntries;
    const unsolved = list.filter((e) => !entrySolved(e));
    if (!unsolved.length) return null;

    if (!current || current.dir !== target) return unsolved[0];

    const i = unsolved.findIndex((e) => e.number === current.number);
    if (i < 0) return unsolved[0];
    return unsolved[(i + 1) % unsolved.length];
  }

  function handleTab() {
    const cur = activeEntry;
    const nextAcross = nextUnsolvedFrom(cur, "across");
    const nextDown = nextUnsolvedFrom(cur, "down");

    if (dir === "across") {
      if (nextAcross) return jumpToEntry(nextAcross);
      if (nextDown) return jumpToEntry(nextDown);
      return;
    } else {
      if (nextDown) return jumpToEntry(nextDown);
      if (nextAcross) return jumpToEntry(nextAcross);
      return;
    }
  }

  function move(dr: number, dc: number) {
    const { r, c } = rc(size, active);
    let rr = r + dr;
    let cc = c + dc;

    while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
      const ni = idx(size, rr, cc);
      if (fill[ni] !== "#") {
        setActive(ni);
        return;
      }
      rr += dr;
      cc += dc;
    }
  }

  function stepForward() {
    if (dir === "across") move(0, 1);
    else move(1, 0);
  }

  function stepBackward() {
    if (dir === "across") move(0, -1);
    else move(-1, 0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!puzzle) return;
    if (fill[active] === "#") return;

    const k = e.key;

    if (k === "Tab") {
      e.preventDefault();
      handleTab();
      return;
    }

    if (k === "Enter") {
      e.preventDefault();
      setDir((d) => (d === "across" ? "down" : "across"));
      return;
    }

    if (k === "ArrowLeft") {
      e.preventDefault();
      setDir("across");
      move(0, -1);
      return;
    }
    if (k === "ArrowRight") {
      e.preventDefault();
      setDir("across");
      move(0, 1);
      return;
    }
    if (k === "ArrowUp") {
      e.preventDefault();
      setDir("down");
      move(-1, 0);
      return;
    }
    if (k === "ArrowDown") {
      e.preventDefault();
      setDir("down");
      move(1, 0);
      return;
    }

    if (k === "Backspace") {
      e.preventDefault();
      setFill((prev) => {
        const next = [...prev];
        next[active] = "";
        return next;
      });
      stepBackward();
      return;
    }

    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      const letter = k.toUpperCase();
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
    if (fill[i] === "#") return;

    if (i === active) setDir((d) => (d === "across" ? "down" : "across"));
    setActive(i);
    focusGrid();
  }

  function reset() {
    if (!puzzle) return;
    const nextFill: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ch = solutionRows[r]?.[c] ?? ".";
        nextFill.push(ch === "." ? "#" : "");
      }
    }
    setFill(nextFill);
    const first = nextFill.findIndex((v) => v !== "#");
    setActive(first >= 0 ? first : 0);
    setDir("across");
    focusGrid();
  }

  if (apiError) {
    return (
      <div style={pageWrap}>
        <h1 style={title}>IGN Daily Crossword (Prototype)</h1>
        <p style={subtitle}>
          A themed crossword prototype. Tab jumps to the next unsolved clue.
        </p>
        <div style={errorBox}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>
            Puzzle failed to load
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{apiError}</pre>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div style={pageWrap}>
        <h1 style={title}>IGN Daily Crossword (Prototype)</h1>
        <p style={subtitle}>Loading…</p>
      </div>
    );
  }

  const gridPx = 560;
  const cellPx = Math.floor(gridPx / size);

  return (
    <div style={pageWrap}>
      <h1 style={title}>IGN Daily Crossword (Prototype)</h1>
      <p style={subtitle}>
        A themed crossword prototype. Tab jumps to the next unsolved clue.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${gridPx + 24}px 1fr`,
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <button onClick={reset} style={btn}>
              Reset
            </button>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Tab = next unsolved clue (Across → Down → Across) · Min word
              length: {MIN_LEN}
            </div>
          </div>

          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            style={{
              width: gridPx,
              height: gridPx,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.25)",
              outline: "none",
            }}
          >
            <div
              style={{
                width: gridPx,
                height: gridPx,
                display: "grid",
                gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
                gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
                gap: 2,
              }}
            >
              {fill.map((val, i) => {
                const blk = val === "#";
                const isActive = i === active;
                const inWord = activeWordCells.has(i);
                const num = numbers[i];

                return (
                  <div
                    key={i}
                    onClick={() => onCellClick(i)}
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.55)",
                      background: blk
                        ? "rgba(0,0,0,0.85)"
                        : isActive
                          ? "rgba(123,97,255,0.55)"
                          : inWord
                            ? "rgba(123,97,255,0.22)"
                            : "#fff",
                      cursor: blk ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: Math.max(16, Math.floor(cellPx * 0.42)),
                      color: blk ? "transparent" : "#111",
                      userSelect: "none",
                    }}
                  >
                    {!blk && num ? (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 6,
                          fontSize: 10,
                          fontWeight: 900,
                          opacity: 0.75,
                          lineHeight: 1,
                          color: "#111",
                        }}
                      >
                        {num}
                      </div>
                    ) : null}
                    {!blk ? val : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
            {activeEntry ? (
              <>
                <strong>
                  {activeEntry.dir.toUpperCase()} {activeEntry.number}:
                </strong>{" "}
                {activeEntry.clue}
              </>
            ) : (
              "Click a cell to start."
            )}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>
            Clues
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <CluePanel
              title="Across"
              entries={acrossEntries}
              active={
                activeEntry?.dir === "across" ? activeEntry.number : undefined
              }
              solved={entrySolved}
              onPick={jumpToEntry}
            />
            <CluePanel
              title="Down"
              entries={downEntries}
              active={
                activeEntry?.dir === "down" ? activeEntry.number : undefined
              }
              solved={entrySolved}
              onPick={jumpToEntry}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CluePanel({
  title,
  entries,
  active,
  solved,
  onPick,
}: {
  title: string;
  entries: Entry[];
  active?: number;
  solved: (e: Entry) => boolean;
  onPick: (e: Entry) => void;
}) {
  return (
    <div style={panel}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
        {entries.map((e) => {
          const a = e.number === active;
          const s = solved(e);
          return (
            <li key={`${e.dir}-${e.number}`} value={e.number}>
              <button
                onClick={() => onPick(e)}
                style={{
                  ...clueBtn,
                  background: a ? "rgba(123,97,255,0.22)" : "transparent",
                  opacity: s ? 0.6 : 1,
                }}
              >
                <strong>{e.number}.</strong> {e.clue}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  padding: "28px 28px 60px",
  background:
    "radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.08), transparent 60%), #050507",
  color: "#fff",
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 44,
  letterSpacing: -0.5,
  fontWeight: 900,
};

const subtitle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 22,
  opacity: 0.85,
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  cursor: "pointer",
  fontWeight: 800,
  color: "#fff",
};

const panel: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.22)",
  padding: 14,
  minHeight: 560,
};

const clueBtn: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  padding: "8px 10px",
  borderRadius: 12,
  cursor: "pointer",
  color: "#fff",
  background: "transparent",
};

const errorBox: React.CSSProperties = {
  marginTop: 18,
  padding: 18,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
};
