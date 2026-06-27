import { useState, useRef, useEffect } from "react";
 
const SYSTEM = `You are a friendly car repair expert helping everyday people understand if they got ripped off at a mechanic. Your audience has NO car knowledge — they are anxious, confused, and just want a straight answer.
 
Use PLAIN ENGLISH only. No technical jargon. No "Mitchell ProDemand" references in your output. Explain everything like you're talking to a friend who knows nothing about cars.
 
You have deep internal knowledge of:
- Fair repair pricing worldwide by city and country
- Standard labor times for all common repairs
- OEM vs aftermarket parts pricing
- Common mechanic scam patterns
 
fairness_score rules (0–100, where 100 = perfectly fair):
- 90–100: Great price, no issues
- 70–89: Acceptable, slightly high but not alarming
- 50–69: Noticeably overpriced
- 25–49: Significantly overpriced
- 0–24: Scam — way too expensive or unnecessary work
 
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
  "summary": "One honest sentence in plain English that a non-car person immediately understands",
  "explanation": "3 sentences in plain everyday English. First sentence: what the job actually involves and how long it should take. Second sentence: what it normally costs in their area. Third sentence: honest verdict on whether they were ripped off.",
  "red_flags": ["plain English red flag 1", "plain English red flag 2"] or [],
  "tip": "One specific tip in plain English for next time — practical and easy to follow"
}`;
 
const EXAMPLES = ["New York, USA", "London, UK", "Sydney, Australia", "Toronto, Canada", "Dubai, UAE"];
 
const SCENARIOS = [
  "Oil change — charged $180",
  "New brake pads — charged $600",
  "Air in tyres — charged $50",
  "Battery replacement — charged $400",
  "AC recharge — charged $300"
];
 
function CircleGauge({ score, color, face, animated }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const hexMap = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" };
  const hex = hexMap[color] || "#888";
  const [current, setCurrent] = useState(0);
 
  useEffect(() => {
    if (!animated) return;
    let frame;
    let start = null;
    const duration = 1600;
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
  const label = score >= 70 ? "Looks Fair" : score >= 40 ? "Overpriced" : "You Got Scammed";
 
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 200, height: 200 }}>
        <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="100" cy="100" r={r} fill="none" stroke="#1e1e2e" strokeWidth="14" />
          <circle cx="100" cy="100" r={r} fill="none" stroke={hex} strokeWidth="14"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 12px ${hex}66)`, transition: "stroke 0.5s" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{face}</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: hex, lineHeight: 1 }}>{current}%</span>
          <span style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", fontWeight: 700 }}>FAIRNESS</span>
        </div>
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
  const [showExamples, setShowExamples] = useState(false);
  const fileRef = useRef(null);
  const resultRef = useRef(null);
 
  const hexMap = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" };
  const bgMap = { green: "#031a0a", yellow: "#150f00", red: "#150000" };
  const borderMap = { green: "#0d3a1a", yellow: "#2a1800", red: "#2a0505" };
  const verdictMap = {
    fair: { label: "You Got a Fair Deal ✓", sub: "Your mechanic charged a reasonable price." },
    overpriced: { label: "You Were Overcharged", sub: "You paid more than you should have." },
    scam: { label: "You Got Scammed", sub: "This price is way above what's normal." }
  };
 
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
        messages = [{ role: "user", content: `What the mechanic did: ${description}\nHow much they charged: ${price}\nLocation: ${location}\n\nWas this fair?` }];
      } else {
        messages = [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: imageType, data: imageBase64 } },
          { type: "text", text: `This is my mechanic invoice. I live in ${location}. Can you check if I was charged a fair price? Please explain it simply.` }
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
      setTimeout(() => {
        setGaugeReady(true);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }, 100);
    } catch {
      setResult({ verdict: "error", face: "⚠️", color: "red", fairness_score: 0, summary: "Something went wrong. Please try again.", explanation: "We couldn't connect to our analysis system. Please check your internet and try again.", red_flags: [], tip: "" });
      setGaugeReady(true);
    }
    setLoading(false);
  }
 
  const hex = result ? (hexMap[result.color] || "#888") : "#888";
  const bgCol = result ? (bgMap[result.color] || "#150000") : "#150000";
  const borderCol = result ? (borderMap[result.color] || "#2a0505") : "#2a0505";
  const verdict = result ? (verdictMap[result.verdict] || { label: result.verdict?.toUpperCase(), sub: "" }) : null;
 
  return (
    <div style={{ fontFamily: "'system-ui', -apple-system, sans-serif", background: "#08080f", minHeight: "100vh", color: "#f0f0f0" }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        * { box-sizing: border-box; }
        .inp { width:100%; background:#0e0e18; border:1.5px solid #1e1e30; border-radius:12px; padding:12px 15px; color:#f0f0f0; font-size:15px; font-family:inherit; outline:none; transition:border 0.2s, box-shadow 0.2s; }
        .inp:focus { border-color:#4a4a80; box-shadow: 0 0 0 3px rgba(74,74,128,0.15); }
        .inp.error { border-color:#ef4444; }
        .inp::placeholder { color:#2a2a40; }
        .mode-btn { flex:1; padding:11px 0; border-radius:10px; border:1.5px solid #1e1e30; background:transparent; color:#444; cursor:pointer; font-size:13px; font-weight:700; letter-spacing:0.03em; transition:all 0.2s; font-family:inherit; }
        .mode-btn.active { background:#14141f; color:#c0c0e0; border-color:#3a3a60; box-shadow: 0 0 0 1px #3a3a6033; }
        .go-btn { width:100%; padding:15px; border-radius:12px; border:none; background:linear-gradient(135deg,#ffffff,#d0d0f0); color:#08080f; font-size:15px; font-weight:800; letter-spacing:0.06em; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .go-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 30px rgba(255,255,255,0.15); }
        .go-btn:disabled { opacity:0.25; cursor:not-allowed; transform:none; }
        .drop { border:2px dashed #1e1e30; border-radius:14px; padding:3rem 1rem; text-align:center; cursor:pointer; transition:all 0.2s; }
        .drop.drag { border-color:#4a4a80; background:#0e0e18; }
        .chip { padding:6px 12px; border-radius:8px; background:#0e0e18; border:1.5px solid #1e1e30; color:#555; font-size:12px; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
        .chip:hover { border-color:#4a4a80; color:#aaa; background:#14141f; }
        .scenario { padding:8px 12px; border-radius:8px; background:#0e0e18; border:1.5px solid #1e1e30; color:#666; font-size:13px; cursor:pointer; font-family:inherit; transition:all 0.15s; text-align:left; width:100%; }
        .scenario:hover { border-color:#4a4a80; color:#bbb; }
        .flag { display:flex; gap:10px; font-size:14px; color:#fca5a5; padding:8px 0; border-bottom:1px solid #1a1a28; line-height:1.5; }
        .flag:last-child { border-bottom:none; }
        .card { background:#0e0e18; border:1.5px solid #1a1a28; border-radius:16px; padding:1.4rem; margin-bottom:1rem; }
        .label { font-size:11px; color:#333; letter-spacing:0.1em; font-weight:700; margin-bottom:0.7rem; text-transform:uppercase; }
        .share-btn { padding:10px 20px; border-radius:10px; background:#14141f; border:1.5px solid #2a2a40; color:#888; font-size:13px; cursor:pointer; font-family:inherit; transition:all 0.2s; }
        .share-btn:hover { border-color:#4a4a80; color:#bbb; }
      `}</style>
 
      {/* Hero header */}
      <div style={{ background: "linear-gradient(180deg, #0e0e20 0%, #08080f 100%)", borderBottom: "1px solid #1a1a28", padding: "2.5rem 1rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 42, marginBottom: 10 }}>🔧</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.06em", margin: "0 0 8px", background: "linear-gradient(135deg,#ffffff,#8080c0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Did Your Mechanic<br />Rip You Off?
        </h1>
        <p style={{ color: "#444", fontSize: 15, margin: "0 auto", maxWidth: 320, lineHeight: 1.6 }}>
          Tell us what they did and how much they charged. We'll tell you if it's fair — in plain English.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          {["No car knowledge needed", "Free to use", "Instant results"].map(t => (
            <span key={t} style={{ fontSize: 12, color: "#333", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "#22c55e" }}>✓</span> {t}
            </span>
          ))}
        </div>
      </div>
 
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
 
        {/* Input card */}
        <div className="card">
          <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem" }}>
            <button className={`mode-btn ${mode === "text" ? "active" : ""}`} onClick={() => { setMode("text"); setResult(null); }}>
              ✏️ Describe it
            </button>
            <button className={`mode-btn ${mode === "photo" ? "active" : ""}`} onClick={() => { setMode("photo"); setResult(null); }}>
              📷 Upload invoice
            </button>
          </div>
 
          {/* Location */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div className="label">Your location <span style={{ color: "#ef4444" }}>*</span></div>
            <input className={`inp ${locationError ? "error" : ""}`} placeholder="e.g. New York, USA" value={location} onChange={e => { setLocation(e.target.value); setLocationError(false); }} />
            {locationError && <p style={{ color: "#ef4444", fontSize: 12, margin: "5px 0 0" }}>We need your location to check local prices</p>}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {EXAMPLES.map(e => <button key={e} className="chip" onClick={() => setLocation(e)}>{e}</button>)}
            </div>
          </div>
 
          {mode === "text" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
                  <div className="label" style={{ margin: 0 }}>What did they do to your car?</div>
                  <button onClick={() => setShowExamples(!showExamples)} style={{ background: "none", border: "none", color: "#4a4a80", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    {showExamples ? "Hide examples" : "See examples ↓"}
                  </button>
                </div>
                {showExamples && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {SCENARIOS.map(s => (
                      <button key={s} className="scenario" onClick={() => {
                        const parts = s.split(" — charged ");
                        setDescription(parts[0]);
                        setPrice(parts[1]);
                        setShowExamples(false);
                      }}>{s}</button>
                    ))}
                  </div>
                )}
                <textarea className="inp" rows={3} placeholder="e.g. They replaced my brake pads and said I needed new rotors too..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: "vertical" }} />
                <p style={{ color: "#2a2a40", fontSize: 12, margin: "5px 0 0" }}>Don't know the technical name? Just describe it in your own words.</p>
              </div>
              <div>
                <div className="label">How much did they charge you?</div>
                <input className="inp" placeholder="e.g. $350 or 280 GBP" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <div className="label">Photo of your invoice or receipt</div>
              <div className={`drop ${dragOver ? "drag" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}>
                {imagePreview
                  ? <img src={imagePreview} alt="Invoice" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, objectFit: "contain" }} />
                  : <div>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                      <p style={{ color: "#333", margin: "0 0 4px", fontSize: 14 }}>Take a photo of your receipt and upload it here</p>
                      <p style={{ color: "#222", margin: 0, fontSize: 12 }}>or drag and drop · JPG, PNG supported</p>
                    </div>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>
              {imagePreview && <button onClick={() => { setImagePreview(null); setImageBase64(null); }} style={{ marginTop: 8, background: "none", border: "none", color: "#444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Remove photo</button>}
            </div>
          )}
 
          <button className="go-btn" style={{ marginTop: "1.25rem" }} onClick={analyze} disabled={!canAnalyze || loading}>
            {loading ? "Checking prices..." : "🔍 Check if I was ripped off"}
          </button>
        </div>
 
        {/* Loading */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #1e1e30", borderTopColor: "#8080c0", borderRadius: "50%", margin: "0 auto 1.25rem", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#444", fontSize: 14, margin: "0 0 4px", letterSpacing: "0.05em", animation: "pulse 1.5s ease infinite" }}>Checking repair prices in your area...</p>
            <p style={{ color: "#222", fontSize: 12, margin: 0 }}>This usually takes 5–10 seconds</p>
          </div>
        )}
 
        {/* Result */}
        {result && !loading && (
          <div ref={resultRef} style={{ animation: "fadeUp 0.5s ease forwards" }}>
 
            {/* Gauge hero */}
            <div style={{ background: bgCol, border: `1.5px solid ${borderCol}`, borderRadius: 20, padding: "2.5rem 1.5rem 2rem", marginBottom: "1rem", textAlign: "center" }}>
              <CircleGauge score={result.fairness_score || 0} color={result.color} face={result.face} animated={gaugeReady} />
              <div style={{ fontSize: 22, fontWeight: 900, color: hex, margin: "1.25rem 0 0.5rem", letterSpacing: "0.02em" }}>
                {verdict?.label}
              </div>
              <p style={{ color: "#666", fontSize: 14, margin: "0 auto", maxWidth: 340, lineHeight: 1.6 }}>{result.summary}</p>
            </div>
 
            {/* Price breakdown */}
            <div className="card">
              <div className="label">Price breakdown</div>
              <div style={{ display: "flex", gap: 10, marginBottom: result.overcharge_percentage > 0 ? "1rem" : 0 }}>
                <div style={{ flex: 1, background: "#08080f", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#2a2a40", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>NORMAL PRICE</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#22c55e" }}>{result.currency_symbol}{result.fair_price_min}–{result.currency_symbol}{result.fair_price_max}</div>
                  <div style={{ fontSize: 11, color: "#2a2a40", marginTop: 4 }}>what's typical in your area</div>
                </div>
                <div style={{ flex: 1, background: "#08080f", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#2a2a40", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>YOU PAID</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: hex }}>{result.currency_symbol}{result.what_they_paid}</div>
                  <div style={{ fontSize: 11, color: "#2a2a40", marginTop: 4 }}>what they charged you</div>
                </div>
              </div>
 
              {result.overcharge_percentage > 0 && (
                <div style={{ background: "#08080f", borderRadius: 12, padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#444" }}>You overpaid by</span>
                    <span style={{ fontSize: 13, color: hex, fontWeight: 800 }}>{result.currency_symbol}{result.overcharge_amount} ({result.overcharge_percentage}% extra)</span>
                  </div>
                  <div style={{ height: 8, background: "#111", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(result.overcharge_percentage, 100)}%`, background: `linear-gradient(90deg,#f59e0b,${hex})`, borderRadius: 99, transition: "width 1.4s ease" }} />
                  </div>
                </div>
              )}
            </div>
 
            {/* Explanation */}
            <div className="card">
              <div className="label">What this means</div>
              <p style={{ color: "#bbb", fontSize: 15, lineHeight: 1.75, margin: 0 }}>{result.explanation}</p>
            </div>
 
            {/* Red flags */}
            {result.red_flags?.length > 0 && (
              <div style={{ background: "#100008", border: "1.5px solid #2a0818", borderRadius: 16, padding: "1.4rem", marginBottom: "1rem" }}>
                <div className="label" style={{ color: "#ef4444" }}>🚩 Watch out for these</div>
                {result.red_flags.map((f, i) => (
                  <div key={i} className="flag">
                    <span style={{ flexShrink: 0, color: "#ef4444", marginTop: 2 }}>▸</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
 
            {/* Tip */}
            {result.tip && (
              <div style={{ background: "#031208", border: "1.5px solid #0a2a18", borderRadius: 16, padding: "1.4rem", marginBottom: "1rem" }}>
                <div className="label" style={{ color: "#22c55e" }}>💡 Tip for next time</div>
                <p style={{ color: "#4a8a64", fontSize: 14, lineHeight: 1.65, margin: 0 }}>{result.tip}</p>
              </div>
            )}
 
            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
              <button className="share-btn" style={{ flex: 1 }} onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "Mechanic Fairness Check", text: `My mechanic charged me ${result.currency_symbol}${result.what_they_paid}. Fairness score: ${result.fairness_score}%. Check yours at MechCheck.`, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}>📤 Share result</button>
              <button className="share-btn" style={{ flex: 1 }} onClick={() => { setResult(null); setDescription(""); setPrice(""); setLocation(""); setImagePreview(null); setImageBase64(null); }}>
                Check another →
              </button>
            </div>
 
            <p style={{ color: "#1a1a28", fontSize: 11, textAlign: "center", margin: 0 }}>
              Results are estimates based on average market prices. Always get multiple quotes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
 