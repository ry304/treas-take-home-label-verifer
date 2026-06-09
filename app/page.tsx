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
    if (result.error) return <div className="text-red-600">Error: {String(result.error)}</div>;
    const r = result.result || result.raw || result;
    if (result.raw && !result.result) {
      return (
        <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-2 rounded">{String(result.raw)}</pre>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(r).map(([k, v]: any) => (
          <div key={k} className="flex items-start gap-3 p-2 rounded border border-gray-100">
            <div className="text-2xl mt-1">{v?.pass ? "✅" : "❌"}</div>
            <div>
              <div className="font-semibold text-lg">{k}</div>
              <div className="text-sm text-gray-700">{v?.text}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-8 bg-slate-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-4">TTB Label Verifier</h1>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Application data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="p-3 border rounded text-lg" placeholder="Brand Name" value={app.brandName} onChange={(e) => updateField("brandName", e.target.value)} />
            <input className="p-3 border rounded text-lg" placeholder="Class/Type" value={app.classType} onChange={(e) => updateField("classType", e.target.value)} />
            <input className="p-3 border rounded text-lg" placeholder="Alcohol Content (e.g., 40% ABV)" value={app.alcoholContent} onChange={(e) => updateField("alcoholContent", e.target.value)} />
            <input className="p-3 border rounded text-lg" placeholder="Net Contents (e.g., 750 mL)" value={app.netContents} onChange={(e) => updateField("netContents", e.target.value)} />
            <input className="p-3 border rounded text-lg col-span-1 md:col-span-2" placeholder="Bottler Name & Address" value={app.bottlerNameAddress} onChange={(e) => updateField("bottlerNameAddress", e.target.value)} />
            <input className="p-3 border rounded text-lg" placeholder="Country of Origin" value={app.countryOfOrigin} onChange={(e) => updateField("countryOfOrigin", e.target.value)} />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Label images</h2>
          <input id="file-input" type="file" accept="image/*" multiple onChange={handleFilesChange} className="mb-2" />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded text-lg" onClick={addToQueue}>Add to Queue</button>
            <button className={`px-4 py-2 rounded text-lg ${processing ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'}`} onClick={processQueue} disabled={processing || queue.length===0}>{processing? 'Processing...' : `Process Queue (${queue.length})`}</button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Queue</h2>
          <div className="space-y-4">
            {queue.length === 0 && <div className="text-gray-600">No items queued.</div>}
            {queue.map((it) => (
              <div key={it.id} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-medium">{it.application.brandName || '(no brand)'} — {it.status}</div>
                </div>
                <div className="flex gap-2 mb-2">
                  {it.files.map((f: File, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">{f.name}</div>
                  ))}
                </div>
                <div>{renderResult(it.result)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
