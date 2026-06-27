import { useState, useRef } from "react";

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

function ScamDetector() {
  const [mode, setMode] = useState("text"); // "text" or "photo"
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const resultRef = useRef(null);

  // Handle image upload
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // Example scenario button handler
  const fillScenario = (scenario) => {
    const parts = scenario.split(" — charged ");
    setDescription(parts[0]);
    setPrice(parts[1]);
  };

  const analyze = async () => {
    if (!location.trim()) {
      alert("Please enter your location");
      return;
    }
    setLoading(true);
    setResult(null);
    // Here you would call your API with the data
    // For demo, simulate delay and fake response
    setTimeout(() => {
      const fakeResponse = {
        verdict: "fair",
        face: "😊",
        color: "green",
        fairness_score: 92,
        fair_price_min: 100,
        fair_price_max: 150,
        currency_symbol: "$",
        what_they_paid: 140,
        overcharge_percentage: 0,
        overcharge_amount: 0,
        summary: "You paid a fair price for the repair.",
        explanation: "The job involved replacing brake pads, which should take about an hour. In your area, this typically costs between $100 and $150. You paid $140, which is within the normal range, so you're not ripped off.",
        red_flags: [],
        tip: "Always ask for an estimate before work starts."
      };
      setResult(fakeResponse);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      setLoading(false);
    }, 1500);
  };

  // Check if can analyze
  const canAnalyze = location.trim() && (mode === "text" ? description.trim() && price.trim() : imageBase64);

  return (
    <div style={{
      backgroundColor: "#0d1117",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      color: "#f0f0f0",
      padding: "2rem"
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        backgroundColor: "#1f2937",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 8px 20px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem", textAlign: "center", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>🔧 Did your mechanic rip you off?</h1>
        <p style={{ fontSize: "1rem", marginBottom: "1.5rem", textAlign: "center", color: "#ccc", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>Tell us what they did and how much they charged. We'll tell you if it's fair — in plain English.</p>

        {/* Mode toggle */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setMode("text")}
            style={{
              padding: "0.75rem 1.2rem",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              backgroundColor: mode === "text" ? "#374151" : "#555",
              color: "#fff",
              fontWeight: "bold"
            }}
          >
            ✏️ Describe it
          </button>
          <button
            onClick={() => setMode("photo")}
            style={{
              padding: "0.75rem 1.2rem",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              backgroundColor: mode === "photo" ? "#374151" : "#555",
              color: "#fff",
              fontWeight: "bold"
            }}
          >
            📷 Upload invoice
          </button>
        </div>

        {/* Input area */}
        {mode === "text" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Description */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "0.9rem", color: "#ccc" }}>What did they do to your car?</div>
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4a4a80",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  {showExamples ? "Hide examples" : "See examples ↓"}
                </button>
              </div>
              {showExamples && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {SCENARIOS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => fillScenario(s)}
                      style={{
                        backgroundColor: "#0e0e18",
                        border: "1px solid #3a3a60",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.85rem"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                placeholder="Describe what happened..."
                rows={3}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #3a3a60",
                  backgroundColor: "#0e0e18",
                  color: "#fff",
                  resize: "vertical"
                }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Price */}
            <div>
              <div style={{ fontSize: "0.9rem", color: "#ccc", marginBottom: "0.3rem" }}>How much did they charge you?</div>
              <input
                type="text"
                placeholder="e.g. $350 or 280 GBP"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #3a3a60",
                  backgroundColor: "#0e0e18",
                  color: "#fff"
                }}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
        ) : (
          // Photo upload mode
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
              style={{
                border: "2px dashed #3a3a60",
                borderRadius: "12px",
                padding: "2rem",
                width: "100%",
                textAlign: "center",
                backgroundColor: dragOver ? "#2a2a2a" : "#0e0e18",
                cursor: "pointer"
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Invoice" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
              ) : (
                <div>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
                  <div style={{ fontSize: "0.9rem", color: "#ccc" }}>Drop your receipt or click to upload</div>
                  <div style={{ fontSize: "0.75rem", color: "#555" }}>JPG, PNG supported</div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
            {imagePreview && (
              <button
                onClick={() => { setImagePreview(null); setImageBase64(null); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "0.75rem",
                  cursor: "pointer"
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <button
          disabled={!canAnalyze || loading}
          onClick={analyze}
          style={{
            marginTop: "1.5rem",
            width: "100%",
            padding: "0.75rem",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            fontWeight: "bold",
            cursor: canAnalyze && !loading ? "pointer" : "not-allowed",
            fontSize: "1rem"
          }}
        >
          {loading ? "Checking repair prices..." : "🔍 Check if I was ripped off"}
        </button>

        {/* Result Section */}
        {result && (
          <div
            ref={resultRef}
            style={{
              marginTop: "2rem",
              backgroundColor: "#111827",
              borderRadius: "15px",
              padding: "1.5rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
            }}
          >
            {/* Verdict Header */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{result.face}</div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  marginBottom: "0.5rem",
                  color: result.color,
                  fontWeight: "bold",
                  textShadow: "0 1px 2px rgba(0,0,0,0.6)"
                }}
              >
                {result.verdict}
              </h2>
              <p style={{ fontSize: "1rem", marginBottom: "1rem", color: "#ccc", lineHeight: "1.4" }}>
                {result.summary}
              </p>
            </div>

            {/* Price Breakdown */}
            <div style={{ backgroundColor: "#1f2937", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Fair Price:</strong> {result.currency_symbol}{result.fair_price_min} – {result.currency_symbol}{result.fair_price_max}
              </div>
              <div>
                <strong>You Paid:</strong> {result.currency_symbol}{result.what_they_paid}
              </div>
              {result.overcharge_percentage > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>Overpaid:</strong> {result.currency_symbol}{result.overcharge_amount} ({result.overcharge_percentage}%)
                </div>
              )}
            </div>

            {/* Explanation */}
            <p style={{ fontSize: "0.9rem", lineHeight: "1.4", color: "#ccc" }}>
              {result.explanation}
            </p>

            {/* Red Flags */}
            {result.red_flags && result.red_flags.length > 0 && (
              <div style={{ backgroundColor: "#300008", border: "1px solid #2a0818", borderRadius: "16px", padding: "1rem", marginTop: "1rem" }}>
                <div style={{ fontSize: "1rem", color: "#ef4444", marginBottom: "0.5rem" }}>🚩 Watch out for these</div>
                {result.red_flags.map((flag, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ef4444" }}>
                    <span>▸</span>
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tip for Next Time */}
            {result.tip && (
              <div style={{ backgroundColor: "#031208", border: "1px solid #0a2a18", borderRadius: "16px", padding: "1rem", marginTop: "1rem" }}>
                <div style={{ fontSize: "1rem", color: "#22c55e", marginBottom: "0.5rem" }}>💡 Tip for next time</div>
                <p style={{ fontSize: "0.9rem", color: "#4a8a64" }}>{result.tip}</p>
              </div>
            )}

            {/* Share & Reset Buttons */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "center" }}>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "Mechanic Fairness Check",
                      text: `My mechanic charged me ${result.currency_symbol}${result.what_they_paid}. Fairness score: ${result.fairness_score}%. Check yours at MechCheck.`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied!");
                  }
                }}
                style={{
                  backgroundColor: "#374151",
                  padding: "0.75rem 1.2rem",
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                📤 Share result
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setDescription("");
                  setPrice("");
                  setLocation("");
                  setImagePreview(null);
                  setImageBase64(null);
                }}
                style={{
                  backgroundColor: "none",
                  padding: "0.75rem 1.2rem",
                  borderRadius: "8px",
                  border: "none",
                  color: "#888",
                  cursor: "pointer"
                }}
              >
                Check another →
              </button>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: "0.75rem", color: "#555", textAlign: "center", marginTop: "1.5rem" }}>
              Results are estimates based on average market prices. Always get multiple quotes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScamDetector;