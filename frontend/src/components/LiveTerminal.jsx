import React, { useEffect, useRef, useState } from "react";
import { Button } from "antd";

const apiUrl = import.meta.env.VITE_API_URL;

// Streams worker logs for a session over SSE (same channel Sheet mode uses).
export default function LiveTerminal({ sessionId }) {
  const [lines, setLines] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    setLines((l) => [...l, `— connecting: ${sessionId} —`]);
    const es = new EventSource(`${apiUrl}/api/progress-stream?sessionId=${encodeURIComponent(sessionId)}`);
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const msg = d.message || (d.type === "connected" ? "connected." : null);
        if (msg) setLines((l) => [...l.slice(-500), msg]);
      } catch { /* ignore malformed */ }
    };
    es.onerror = () => { /* SSE auto-reconnects */ };
    return () => es.close();
  }, [sessionId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines]);

  return (
    <div>
      <div style={{ textAlign: "right", marginBottom: 6 }}>
        <Button size="small" onClick={() => setLines([])}>Clear</Button>
      </div>
      <div
        ref={boxRef}
        style={{
          background: "#0b0f19", color: "#c8e1ff",
          fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.5,
          padding: 12, height: 240, overflow: "auto", borderRadius: 8,
        }}
      >
        {lines.length === 0
          ? <div style={{ opacity: 0.6 }}>waiting for logs…</div>
          : lines.map((l, i) => <div key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</div>)}
      </div>
    </div>
  );
}
