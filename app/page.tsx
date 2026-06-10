"use client";

import React, { useState } from "react";

type Application = {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  bottlerNameAddress: string;
  countryOfOrigin: string;
};

type FieldResult = { pass: boolean; text: string };

export default function Home() {
  const [app, setApp] = useState<Application>({
    brandName: "",
    classType: "",
    alcoholContent: "",
    netContents: "",
    bottlerNameAddress: "",
    countryOfOrigin: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  function updateField<K extends keyof Application>(k: K, v: string) {
    setApp((s) => ({ ...s, [k]: v }));
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f) return;
    setFiles(Array.from(f));
  }

  function addToQueue() {
    if (files.length === 0) return alert("Please attach at least one label image.");
    setQueue((q) => [
      ...q,
      {
        id: Date.now() + Math.random(),
        application: { ...app },
        files,
        status: "queued",
        result: null,
      },
    ]);
    // Reset form for next entry
    setApp({ brandName: "", classType: "", alcoholContent: "", netContents: "", bottlerNameAddress: "", countryOfOrigin: "" });
    setFiles([]);
    (document.getElementById("file-input") as HTMLInputElement | null)?.value && ((document.getElementById("file-input") as HTMLInputElement).value = "");
  }

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function processQueue() {
    setProcessing(true);
    const newQueue = [...queue];
    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];
      if (item.status === "done") continue;
      newQueue[i] = { ...item, status: "processing" };
      setQueue([...newQueue]);

      try {
        const images = await Promise.all(item.files.map((f: File) => fileToDataUrl(f)));
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ application: item.application, images }),
        });
        const data = await res.json();
        newQueue[i] = { ...newQueue[i], status: "done", result: data };
        setQueue([...newQueue]);
      } catch (e: any) {
        newQueue[i] = { ...newQueue[i], status: "error", result: { error: e?.message || String(e) } };
        setQueue([...newQueue]);
      }
    }
    setProcessing(false);
  }

  function renderResult(result: any) {
    if (!result) return null;
    if (result.error) return <div style={{ color: "#b91c1c" }}>Error: {String(result.error)}</div>;
    const r = result.result || result.raw || result;
    if (result.raw && !result.result) {
      return (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f3f4f6", padding: 8, borderRadius: 4 }}>{String(result.raw)}</pre>
      );
    }

    const rows = Object.entries(r);
    return (
      <div>
        {rows.map(([k, v]: any, idx: number) => {
          const bg = idx % 2 === 0 ? "#ffffff" : "#f1f5f9";
          const pass = v?.pass;
          return (
            <div key={k} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: bg, borderRadius: 4, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: pass ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                {pass ? "✓" : "✕"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{k}</div>
                <div style={{ fontSize: 13, color: "#374151" }}>{v?.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const styles: Record<string, React.CSSProperties> = {
    page: { backgroundColor: "#f8f9fb", minHeight: "100vh", fontFamily: "Arial, Helvetica, sans-serif", padding: 24 },
    container: { maxWidth: 980, margin: "0 auto", background: "#ffffff", borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
    header: { backgroundColor: "#1a2744", color: "#ffffff", padding: "18px 20px" },
    headerTitle: { fontSize: 18, fontWeight: 700 },
    headerSub: { fontSize: 14, color: "#c8a951", marginTop: 6, fontWeight: 700 },
    body: { padding: 20 },
    section: { marginBottom: 18, borderRadius: 4, overflow: "hidden" },
    sectionHeader: { backgroundColor: "#10213a", color: "#ffffff", padding: "8px 12px", textTransform: "uppercase", fontSize: 12, fontWeight: 700 },
    sectionBody: { padding: 12 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    label: { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6, color: "#1f2937" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 16 },
    buttonPrimary: { backgroundColor: "#1a2744", color: "#fff", padding: "10px 14px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    buttonAccent: { backgroundColor: "#c8a951", color: "#10213a", padding: "10px 14px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    chooseButton: { backgroundColor: "#1a2744", color: "#fff", padding: "10px 14px", border: "1px solid #10213a", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    queueItem: { padding: 12, border: "1px solid #e6eef8", borderRadius: 4, marginBottom: 10, background: "#ffffff" },
    footer: { padding: 12, textAlign: "center", fontSize: 12, color: "#6b7280", background: "#f1f5f9", marginTop: 12 },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerTitle}>U.S. Department of the Treasury — TTB</div>
          <div style={styles.headerSub}>Label Compliance Verifier</div>
        </header>

        <main style={styles.body}>
          <section style={styles.section}>
            <div style={styles.sectionHeader}>1 • Application Data</div>
            <div style={styles.sectionBody}>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Brand Name</label>
                  <input style={styles.input} placeholder="Brand Name" value={app.brandName} onChange={(e) => updateField("brandName", e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Class / Type</label>
                  <input style={styles.input} placeholder="Class/Type" value={app.classType} onChange={(e) => updateField("classType", e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>Alcohol Content</label>
                  <input style={styles.input} placeholder="Alcohol Content (e.g., 40% ABV)" value={app.alcoholContent} onChange={(e) => updateField("alcoholContent", e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Net Contents</label>
                  <input style={styles.input} placeholder="Net Contents (e.g., 750 mL)" value={app.netContents} onChange={(e) => updateField("netContents", e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>Bottler Name & Address</label>
                  <input style={styles.input} placeholder="Bottler Name & Address" value={app.bottlerNameAddress} onChange={(e) => updateField("bottlerNameAddress", e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Country of Origin</label>
                  <input style={styles.input} placeholder="Country of Origin" value={app.countryOfOrigin} onChange={(e) => updateField("countryOfOrigin", e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>2 • Label Image</div>
            <div style={styles.sectionBody}>
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <input id="file-input" type="file" accept="image/*" multiple onChange={handleFilesChange} style={{ display: "none" }} />
                <button
                  type="button"
                  style={styles.chooseButton}
                  onClick={() => (document.getElementById("file-input") as HTMLInputElement | null)?.click()}
                >
                  Choose Files
                </button>
                <div style={{ color: "#374151", fontSize: 14 }}>
                  {files.length === 0 ? "No files selected" : files.map((f) => f.name).join(", ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={styles.buttonPrimary} onClick={addToQueue}>Add to Queue</button>
                <button style={styles.buttonAccent} onClick={processQueue} disabled={processing || queue.length === 0}>{processing ? "Processing..." : `Verify Queue (${queue.length})`}</button>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>3 • Verification Queue</div>
            <div style={styles.sectionBody}>
              {queue.length === 0 && <div style={{ color: "#374151" }}>No items queued.</div>}
              {queue.map((it) => (
                <div key={it.id} style={styles.queueItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{it.application.brandName || "(no brand)"}</div>
                    <div style={{ color: "#374151" }}>{it.status}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    {it.files.map((f: File, idx: number) => (
                      <div key={idx} style={{ fontSize: 13, color: "#374151" }}>{f.name}</div>
                    ))}
                  </div>
                  <div>{renderResult(it.result)}</div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer style={styles.footer}>TTB LABEL COMPLIANCE VERIFIER — PROTOTYPE — NOT FOR OFFICIAL USE</footer>
      </div>
    </div>
  );
}
