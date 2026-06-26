import { useState, useRef, useEffect } from "react";
 
const SYSTEM = `You are a senior automotive repair expert and certified mechanic with 25 years of experience across North America, Europe, Australia, and Asia.
 
You have deep expertise in:
- Mitchell ProDemand and AllData industry-standard labor time guides
- OEM vs OEM-equivalent vs aftermarket parts pricing by vehicle make/model/year
- Regional labor rate variations by specific city and country
- Dealership vs independent shop pricing differences
- Paint and body repair industry standards (PPG, BASF paint systems)
- Common mechanic fraud patterns: labor padding, unnecessary services, parts substitution fraud
- Seasonal pricing fluctuations and parts availability
 
When analyzing a repair:
1. Cross-reference labor hours against Mitchell/AllData standard times — flag if hours are inflated
2. Price parts accurately for the specific vehicle, year, trim level
3. Apply correct regional labor rates for the EXACT city/country provided — this is critical
4. Identify OEM vs aftermarket pricing differences and flag substitution fraud
5. Detect upselling patterns, duplicated labor, or bundled unnecessary services
6. Be strict and consumer-protective — mechanics overcharging is endemic
 
fairness_score rules (0–100, where 100 = perfectly fair):
- 90–100: At or below fair market value
- 70–89: Within acceptable range (up to 20% over)
- 50–69: Noticeably overpriced (20–50% over)
- 25–49: Significantly overpriced (50–80% over)
- 0–24: Scam level pricing (80%+ over, or unnecessary service)
 
Respond ONLY with valid JSON, no other text:
{
  "verdict": "fair" | "overpriced" | "scam",
  "face": "😊" | "😑" | "😡",
  "color": "green" | "yellow" | "red",
  "fairness_score": number,
  "fair_price_min": number,
  "fair_price_max": number,
  "currency_symbol": "$ or £ or € etc",
  "what_they_paid": number,
  "overcharge_percentage": number,
  "overcharge_amount": number,
  "summary": "One punchy honest sentence",
  "explanation": "3 sentences: labor analysis, parts analysis, final verdict with specific regional context",
  "red_flags": ["specific flag 1", "specific flag 2"] or [],
  "tip": "One specific actionable tip relevant to this exact repair type"
}`;
 
const EXAMPLES = ["New York, USA", "London, UK", "Sydney, Australia", "Toronto, Canada", "Dubai, UAE"];
 
function CircleGauge({ score, color, face, animated }) {
  const r = 68;
  const circ = 2 * Math.PI * r;
  const hexMap = { green: "#22c55e", yellow: "#eab308", red: "#ef4444" };
  const hex = hexMap[color] || "#888";
  const [current, setCurrent] = useState(0);
 
  useEffect(() => {
    if (!animated) return;
    let frame;
    let start = null;
    const duration = 1400;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCurrent(Math.round(ease * score));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, animated]);
 
  const offset = circ * (1 - current / 100);
 
  return (
    <div style={{ position: "relative", width: 190, height: 190, margin: "0 auto" }}>
      <svg width="190" height="190" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="95" cy="95" r={r} fill="none" stroke="#1a1a22" strokeWidth="13" />
        <circle cx="95" cy="95" r={r} fill="none" stroke={hex} strokeWidth="13"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${hex}88)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <span style={{ fontSize: 44, lineHeight: 1 }}>{face}</span>
        <span style={{ fontSize: 26, fontWeight: 900, color: hex, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{current}%</span>
        <span style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", fontWeight: 700 }}>FAIR SCORE</span>
      </div>
    </div>
  );
}
 
export default function ScamDetector() {
  const [mode, setMode] = useState("text");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageType, setImageType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [gaugeReady, setGaugeReady] = useState(false);
  const fileRef = useRef(null);
 
  const hexMap = { green: "#22c55e", yellow: "#eab308", red: "#ef4444" };
  const bgMap = { green: "#031a0a", yellow: "#120e00", red: "#150000" };
  const borderMap = { green: "#0d3a1a", yellow: "#2a2000", red: "#2a0505" };
  const verdictLabel = { fair: "FAIR PRICE ✓", overpriced: "OVERPRICED", scam: "YOU GOT SCAMMED" };
 
  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => { setImagePreview(e.target.result); setImageBase64(e.target.result.split(",")[1]); };
    reader.readAsDataURL(file);
  }
 
  const canAnalyze = location.trim().length > 2 && (mode === "text" ? description.trim() && price.trim() : imageBase64 !== null);
 
  async function analyze() {
    if (!location.trim()) { setLocationError(true); return; }
    setLocationError(false);
    setLoading(true);
    setResult(null);
    setGaugeReady(false);
 
    try {
      let messages;
      if (mode === "text") {
        messages = [{ role: "user", content: `Service: ${description}\nPrice charged: ${price}\nLocation: ${location}\n\nAnalyse this repair cost.` }];
      } else {
        messages = [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: imageType, data: imageBase64 } },
          { type: "text", text: `Mechanic invoice photo. Location: ${location}. Extract all services and total cost, then analyse if the customer was overcharged.` }
        ]}];
      }
 
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${import.meta.env.VITE_GROQ_KEY}`
  },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: messages[0].content }
    ],
    max_tokens: 1000
  })
});

const data = await res.json();
const text = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
      setTimeout(() => setGaugeReady(true), 100);
    } catch {
      setResult({ verdict: "error", face: "⚠️", color: "red", fairness_score: 0, summary: "Analysis failed — please try again.", explanation: "Connection error.", red_flags: [], tip: "" });
      setGaugeReady(true);
    }
    setLoading(false);
  }
 
  const hex = result ? (hexMap[result.color] || "#888") : "#888";
  const bgCol = result ? (bgMap[result.color] || "#150000") : "#150000";
  const borderCol = result ? (borderMap[result.color] || "#2a0505") : "#2a0505";
 
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#060608", minHeight: "100vh", padding: "2rem 1rem", color: "#f0f0f0" }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .inp { width:100%; background:#0c0c10; border:1px solid #1e1e28; border-radius:10px; padding:11px 14px; color:#f0f0f0; font-size:14px; font-family:inherit; outline:none; box-sizing:border-box; transition:border 0.2s; }
        .inp:focus { border-color:#3a3a50; }
        .inp.error { border-color:#ef4444; }
        .inp::placeholder { color:#333; }
        .mode-btn { flex:1; padding:9px 0; border-radius:8px; border:1px solid #1e1e28; background:transparent; color:#444; cursor:pointer; font-size:13px; font-weight:700; letter-spacing:0.04em; transition:all 0.2s; font-family:inherit; }
        .mode-btn.active { background:#12121a; color:#d0d0f0; border-color:#3a3a50; }
        .go-btn { width:100%; padding:13px; border-radius:10px; border:none; background:linear-gradient(135deg,#e8e8f0,#c0c0d8); color:#060608; font-size:14px; font-weight:800; letter-spacing:0.1em; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .go-btn:hover:not(:disabled) { background:#fff; transform:translateY(-1px); box-shadow:0 4px 20px rgba(255,255,255,0.1); }
        .go-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .drop { border:2px dashed #1e1e28; border-radius:12px; padding:2.5rem 1rem; text-align:center; cursor:pointer; transition:all 0.2s; }
        .drop.drag { border-color:#3a3a50; background:#0c0c10; }
        .chip-loc { padding:4px 10px; border-radius:6px; background:#0c0c10; border:1px solid #1e1e28; color:#555; font-size:11px; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
        .chip-loc:hover { border-color:#3a3a50; color:#aaa; }
        .flag { display:flex; gap:8px; font-size:13px; color:#f87171; padding:7px 0; border-bottom:1px solid #1a1a22; line-height:1.4; }
        .flag:last-child { border-bottom:none; }
        .card { background:#0e0e14; border:1px solid #1a1a22; border-radius:14px; padding:1.25rem; margin-bottom:1rem; }
        .label { font-size:10px; color:#444; letter-spacing:0.1em; font-weight:700; margin-bottom:0.6rem; }
      `}</style>
 
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
 
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🔧</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.12em", margin: "0 0 4px", background: "linear-gradient(135deg,#e8e8f8,#606080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SCAM DETECTOR</h1>
          <p style={{ color: "#333", fontSize: 12, margin: 0, letterSpacing: "0.08em" }}>IS YOUR MECHANIC RIPPING YOU OFF?</p>
        </div>
 
        {/* Input card */}
        <div className="card" style={{ marginBottom: "1rem" }}>
 
          <div style={{ display: "flex", gap: 8, marginBottom: "1.1rem" }}>
            <button className={`mode-btn ${mode === "text" ? "active" : ""}`} onClick={() => { setMode("text"); setResult(null); }}>✏️ Describe it</button>
            <button className={`mode-btn ${mode === "photo" ? "active" : ""}`} onClick={() => { setMode("photo"); setResult(null); }}>📷 Upload invoice</button>
          </div>
 
          {/* Location — always shown, always required */}
          <div style={{ marginBottom: "1rem" }}>
            <div className="label">LOCATION <span style={{ color: "#ef4444" }}>*</span></div>
            <input className={`inp ${locationError ? "error" : ""}`} placeholder="e.g. New York, USA" value={location} onChange={e => { setLocation(e.target.value); setLocationError(false); }} />
            {locationError && <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0" }}>Location is required for accurate pricing</p>}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {EXAMPLES.map(e => <button key={e} className="chip-loc" onClick={() => setLocation(e)}>{e}</button>)}
            </div>
          </div>
 
          {mode === "text" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="label">WHAT DID THEY DO?</div>
                <textarea className="inp" rows={3} placeholder="e.g. Front bumper R&R and paint, 2021 Toyota Camry..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <div>
                <div className="label">PRICE CHARGED</div>
                <input className="inp" placeholder="e.g. $1,100 or 850 GBP" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <div className="label">INVOICE PHOTO</div>
              <div className={`drop ${dragOver ? "drag" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="Invoice" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, objectFit: "contain" }} />
                  : <div><div style={{ fontSize: 28, marginBottom: 8 }}>📄</div><p style={{ color: "#333", margin: 0, fontSize: 13 }}>Drop invoice or <span style={{ color: "#555", textDecoration: "underline" }}>browse</span></p></div>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>
            </div>
          )}
 
          <button className="go-btn" style={{ marginTop: "1.1rem" }} onClick={analyze} disabled={!canAnalyze || loading}>
            {loading ? "ANALYSING..." : "🔍 ANALYSE NOW"}
          </button>
        </div>
 
        {/* Loading */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #1e1e28", borderTopColor: "#606080", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#333", fontSize: 12, letterSpacing: "0.1em", margin: 0, animation: "pulse 1.5s ease infinite" }}>SCANNING REPAIR DATA...</p>
          </div>
        )}
 
        {/* Result */}
        {result && !loading && (
          <div style={{ animation: "fadeUp 0.4s ease forwards" }}>
 
            {/* Gauge hero */}
            <div style={{ background: bgCol, border: `1px solid ${borderCol}`, borderRadius: 16, padding: "2rem 1.5rem 1.5rem", marginBottom: "1rem", textAlign: "center" }}>
              <CircleGauge score={result.fairness_score || 0} color={result.color} face={result.face} animated={gaugeReady} />
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.1em", color: hex, margin: "1rem 0 0.5rem" }}>{verdictLabel[result.verdict] || result.verdict?.toUpperCase()}</div>
              <p style={{ color: "#777", fontSize: 13, margin: 0, lineHeight: 1.55 }}>{result.summary}</p>
            </div>
 
            {/* Price breakdown */}
            <div className="card">
              <div className="label">PRICE BREAKDOWN</div>
              <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
                <div style={{ flex: 1, background: "#060608", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 5 }}>FAIR RANGE</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#22c55e" }}>{result.currency_symbol}{result.fair_price_min}–{result.currency_symbol}{result.fair_price_max}</div>
                </div>
                <div style={{ flex: 1, background: "#060608", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.08em", marginBottom: 5 }}>YOU PAID</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: hex }}>{result.currency_symbol}{result.what_they_paid}</div>
                </div>
              </div>
 
              {result.overcharge_percentage > 0 && (
                <div style={{ background: "#060608", borderRadius: 10, padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#444" }}>Overcharged</span>
                    <span style={{ fontSize: 12, color: hex, fontWeight: 700 }}>+{result.overcharge_percentage}% ({result.currency_symbol}{result.overcharge_amount})</span>
                  </div>
                  <div style={{ height: 7, background: "#111", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(result.overcharge_percentage, 100)}%`, background: `linear-gradient(90deg,#eab308,${hex})`, borderRadius: 99, transition: "width 1.2s ease" }} />
                  </div>
                </div>
              )}
            </div>
 
            {/* Analysis */}
            <div className="card">
              <div className="label">ANALYSIS</div>
              <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{result.explanation}</p>
            </div>
 
            {/* Red flags */}
            {result.red_flags?.length > 0 && (
              <div style={{ background: "#0f0000", border: "1px solid #2a0808", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" }}>
                <div className="label" style={{ color: "#ef4444" }}>🚩 RED FLAGS</div>
                {result.red_flags.map((f, i) => <div key={i} className="flag"><span style={{ flexShrink: 0, marginTop: 1 }}>▸</span>{f}</div>)}
              </div>
            )}
 
            {/* Tip */}
            {result.tip && (
              <div style={{ background: "#030f05", border: "1px solid #0a2a10", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" }}>
                <div className="label" style={{ color: "#22c55e" }}>💡 PRO TIP</div>
                <p style={{ color: "#4a7a54", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{result.tip}</p>
              </div>
            )}
 
            <button onClick={() => { setResult(null); setDescription(""); setPrice(""); setLocation(""); setImagePreview(null); setImageBase64(null); }}
              style={{ width: "100%", padding: 12, background: "transparent", border: "1px solid #1e1e28", borderRadius: 10, color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em", transition: "border 0.2s" }}>
              CHECK ANOTHER →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
 