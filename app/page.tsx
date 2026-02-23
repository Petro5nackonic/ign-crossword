import CrosswordGame from "@/components/CrosswordGame";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 28px",
        background: "radial-gradient(1200px 600px at 20% 0%, #1b1b1f 0%, #0b0b0e 55%, #070709 100%)",
        color: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: -0.5 }}>
          IGN Daily Crossword (Prototype)
        </h1>
        <p style={{ marginTop: 8, marginBottom: 18, opacity: 0.85 }}>
          A themed crossword prototype. Tab jumps to the next unsolved clue.
        </p>

        <CrosswordGame />
      </div>
    </main>
  );
}