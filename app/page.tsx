"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

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
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);
  const [bulkMinimized, setBulkMinimized] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  function updateField<K extends keyof Application>(k: K, v: string) {
    setApp((s) => ({ ...s, [k]: v }));
  }

  const fieldLabelMap: Record<string, string> = {
    brandName: "Brand Name",
    classType: "Class / Type",
    alcoholContent: "Alcohol Content",
    netContents: "Net Contents",
    bottlerNameAddress: "Bottler Name & Address",
    countryOfOrigin: "Country of Origin",
    governmentWarning: "Government Warning",
  };

  function getFieldLabel(key: string) {
    return fieldLabelMap[key] || key;
  }

  function getSummaryBadge(result: any) {
    if (!result) return null;
    if (result.error) {
      return {
        text: "Error",
        background: "#dc2626",
        color: "#fff",
      };
    }
    const r = result.result || result.raw || result;
    const rows = Object.entries(r).filter(([, v]: any) => v && typeof v.pass === "boolean");
    const passedCount = rows.filter(([, v]: any) => v.pass).length;
    const totalCount = rows.length;
    const allPassed = totalCount > 0 && passedCount === totalCount;
    return {
      text: `${passedCount}/${totalCount} Passed`,
      background: allPassed ? "#16a34a" : "#dc2626",
      color: "#ffffff",
    };
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f) return;
    setFiles(Array.from(f));
  }

  function downloadTemplate() {
    const headers = [
      "Brand Name",
      "Class/Type",
      "Alcohol Content",
      "Net Contents",
      "Bottler Name & Address",
      "Country of Origin",
      "Image Filename",
    ];
    const csv = [headers.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ttb-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function normalizeFilename(name: string) {
    return name.trim().toLowerCase();
  }

  function parseBulkFile(file: File) {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          if (!data) return reject(new Error("No file data."));
          const workbook = XLSX.read(data, { type: file.name.endsWith(".csv") ? "binary" : "binary" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
          resolve(rows as any[]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read bulk file."));
      reader.readAsBinaryString(file);
    });
  }

  async function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f || f.length === 0) return;
    const rows: any[] = [];
    for (let i = 0; i < f.length; i += 1) {
      const file = f[i];
      const parsed = await parseBulkFile(file);
      rows.push(...parsed);
    }
    setBulkRows(rows);
    setBulkWarnings([]);
  }

  function handleBulkImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f) return;
    setBulkImages(Array.from(f));
  }

  function mapRowToApplication(row: any) {
    return {
      brandName: row["Brand Name"] || "",
      classType: row["Class/Type"] || "",
      alcoholContent: row["Alcohol Content"] || "",
      netContents: row["Net Contents"] || "",
      bottlerNameAddress: row["Bottler Name & Address"] || "",
      countryOfOrigin: row["Country of Origin"] || "",
    };
  }

  function importAllToQueue() {
    if (bulkRows.length === 0) {
      return alert("No bulk rows to import.");
    }
    const imagesByName = new Map<string, File>();
    bulkImages.forEach((file) => {
      imagesByName.set(normalizeFilename(file.name), file);
    });
    const warnings: string[] = [];
    const items = bulkRows.map((row, index) => {
      const filename = row["Image Filename"] ? normalizeFilename(row["Image Filename"]) : "";
      const imageFile = imagesByName.get(filename);
      if (!imageFile) {
        warnings.push(`Row ${index + 1}: missing image for ${row["Image Filename"] || "(blank)"}`);
      }
      return {
        id: Date.now() + Math.random() + index,
        application: mapRowToApplication(row),
        files: imageFile ? [imageFile] : [],
        status: imageFile ? "queued" : "missing-image",
        result: null,
      };
    });
    const matchedItems = items.filter((item) => item.status !== "missing-image");
    setQueue((q) => [...q, ...matchedItems]);
    setBulkWarnings(warnings);
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

  function removeQueueItem(id: number) {
    setQueue((q) => q.filter((item) => item.id !== id));
  }

  function clearQueue() {
    setQueue([]);
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
                <div style={{ fontWeight: 700, fontSize: 16 }}>{getFieldLabel(k)}</div>
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
    toggleButton: { backgroundColor: "transparent", color: "#c8a951", border: "1px solid #c8a951", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    label: { display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6, color: "#1f2937" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 16 },
    buttonPrimary: { backgroundColor: "#1a2744", color: "#fff", padding: "10px 14px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    buttonAccent: { backgroundColor: "#c8a951", color: "#10213a", padding: "10px 14px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    chooseButton: { backgroundColor: "#464b55", color: "#fff", padding: "10px 14px", border: "1px solid #10213a", borderRadius: 4, cursor: "pointer", fontSize: 16 },
    buttonDanger: { backgroundColor: "#dc2626", color: "#fff", padding: "8px 12px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 },
    buttonInlineAccept: { backgroundColor: "#c8a951", color: "#10213a", padding: "5px 10px", border: "none", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 700 },
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#10213a", color: "#ffffff", padding: "8px 12px", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
              <span>Bulk Import</span>
              <button type="button" style={styles.toggleButton} onClick={() => setBulkMinimized((prev) => !prev)}>
                {bulkMinimized ? "Expand" : "Minimize"}
              </button>
            </div>
            {!bulkMinimized && (
              <div style={styles.sectionBody}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <button style={styles.buttonPrimary} type="button" onClick={downloadTemplate}>
                    Download Template
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input id="bulk-file-input" type="file" accept=".csv,.xlsx,.xls" multiple onChange={handleBulkFileChange} style={{ display: "none" }} />
                    <button type="button" style={styles.chooseButton} onClick={() => (document.getElementById("bulk-file-input") as HTMLInputElement | null)?.click()}>
                      Choose CSV / Excel
                    </button>
                    <div style={{ color: "#374151", fontSize: 14 }}>
                      {bulkRows.length === 0 ? "No file selected" : `${bulkRows.length} rows loaded`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input id="bulk-image-input" type="file" accept="image/*" multiple onChange={handleBulkImagesChange} style={{ display: "none" }} />
                    <button type="button" style={styles.chooseButton} onClick={() => (document.getElementById("bulk-image-input") as HTMLInputElement | null)?.click()}>
                      Choose Label Images
                    </button>
                    <div style={{ color: "#374151", fontSize: 14 }}>
                      {bulkImages.length === 0 ? "No images selected" : `${bulkImages.length} images selected`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={styles.buttonAccent} type="button" onClick={importAllToQueue}>
                    Import All to Queue
                  </button>
                </div>
                {bulkWarnings.length > 0 && (
                  <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 12, borderRadius: 4 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Warnings</div>
                    {bulkWarnings.map((warning, idx) => (
                      <div key={idx} style={{ fontSize: 13 }}>{warning}</div>
                    ))}
                  </div>
                )}
                {bulkRows.length > 0 && (
                  <div style={{ overflowX: "auto", border: "1px solid #d1d5db", borderRadius: 4 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#1a2744", color: "#fff", textTransform: "uppercase", fontSize: 12 }}>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Brand Name</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Class/Type</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Alcohol Content</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Net Contents</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Bottler Name & Address</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Country of Origin</th>
                          <th style={{ padding: 10, border: "1px solid #e2e8f0" }}>Image Filename</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 6).map((row, idx) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Brand Name"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Class/Type"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Alcohol Content"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Net Contents"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Bottler Name & Address"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Country of Origin"] || ""}</td>
                            <td style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>{row["Image Filename"] || ""}</td>
                          </tr>
                        ))}
                        {bulkRows.length > 6 && (
                          <tr>
                            <td colSpan={7} style={{ padding: 10, border: "1px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
                              Showing 6 of {bulkRows.length} rows.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          </section>
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
              {queue.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button type="button" style={styles.buttonDanger} onClick={clearQueue}>
                    Clear Queue
                  </button>
                </div>
              )}
              {queue.length === 0 && <div style={{ color: "#374151" }}>No items queued.</div>}
              {queue.map((it) => (
                <div key={it.id} style={styles.queueItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10 }}>
                    <div style={{ fontWeight: 700 }}>{it.application.brandName || "(no brand)"}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {it.status === "done" ? (
                        (() => {
                          const badge = getSummaryBadge(it.result);
                          return (
                            <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, background: badge?.background, color: badge?.color, fontSize: 13, fontWeight: 700 }}>
                              {badge?.text}
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ color: "#374151" }}>{it.status}</div>
                      )}
                      <button type="button" style={styles.buttonInlineAccept} onClick={() => removeQueueItem(it.id)}>
                        Remove
                      </button>
                    </div>
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
