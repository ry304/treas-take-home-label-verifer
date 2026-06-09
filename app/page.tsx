'use client';

import { useState, useRef } from 'react';

type FieldResult = {
  pass: boolean;
  text: string;
};

type VerificationResult = {
  brandName?: FieldResult;
  classType?: FieldResult;
  alcoholContent?: FieldResult;
  netContents?: FieldResult;
  bottlerNameAddress?: FieldResult;
  countryOfOrigin?: FieldResult;
  governmentWarning?: FieldResult;
};

type QueueItem = {
  id: string;
  brandName: string;
  imageName: string;
  application: Record<string, string>;
  images: string[];
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: VerificationResult;
  error?: string;
};

const FIELD_LABELS: Record<string, string> = {
  brandName: 'Brand Name',
  classType: 'Class / Type',
  alcoholContent: 'Alcohol Content',
  netContents: 'Net Contents',
  bottlerNameAddress: 'Bottler Name & Address',
  countryOfOrigin: 'Country of Origin',
  governmentWarning: 'Government Warning',
};

export default function Home() {
  const [form, setForm] = useState({
    brandName: '',
    classType: '',
    alcoholContent: '',
    netContents: '',
    bottlerNameAddress: '',
    countryOfOrigin: '',
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addToQueue = async () => {
    if (!files || files.length === 0) return;
    const images = await Promise.all(Array.from(files).map(toBase64));
    const item: QueueItem = {
      id: crypto.randomUUID(),
      brandName: form.brandName || '(no brand)',
      imageName: files[0].name,
      application: { ...form },
      images,
      status: 'pending',
    };
    setQueue((q) => [...q, item]);
    setForm({ brandName: '', classType: '', alcoholContent: '', netContents: '', bottlerNameAddress: '', countryOfOrigin: '' });
    setFiles(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const processQueue = async () => {
    setProcessing(true);
    for (const item of queue) {
      if (item.status !== 'pending') continue;
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'processing' } : i));
      try {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ application: item.application, images: item.images }),
        });
        const data = await res.json();
        if (data.result) {
          setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'done', result: data.result } : i));
        } else {
          setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'error', error: data.error || data.raw || 'Unknown error' } : i));
        }
      } catch (err: unknown) {
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'error', error: String(err) } : i));
      }
    }
    setProcessing(false);
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fb', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ backgroundColor: '#1a2744', borderBottom: '4px solid #c8a951' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, backgroundColor: '#c8a951', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>???</span>
          </div>
          <div>
            <div style={{ color: '#c8a951', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>U.S. Department of the Treasury — TTB</div>
            <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>Label Compliance Verifier</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
        <section style={{ backgroundColor: '#ffffff', border: '1px solid #dde1e9', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f0f2f7', borderBottom: '1px solid #dde1e9', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 24, backgroundColor: '#1a2744', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#c8a951', fontSize: 12, fontWeight: 700 }}>1</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Application Data</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { name: 'brandName', label: 'Brand Name', placeholder: 'e.g. OLD TOM DISTILLERY' },
                { name: 'classType', label: 'Class / Type', placeholder: 'e.g. Kentucky Straight Bourbon Whiskey' },
                { name: 'alcoholContent', label: 'Alcohol Content', placeholder: 'e.g. 45% Alc./Vol. (90 Proof)' },
                { name: 'netContents', label: 'Net Contents', placeholder: 'e.g. 750 mL' },
              ].map((field) => (
                <div key={field.name}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{field.label}</label>
                  <input
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #dde1e9', borderRadius: 4, fontSize: 14, color: '#1a2744', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { name: 'bottlerNameAddress', label: 'Bottler Name & Address', placeholder: 'e.g. Old Tom Distillery, Louisville, KY 40202' },
                { name: 'countryOfOrigin', label: 'Country of Origin', placeholder: 'e.g. USA' },
              ].map((field) => (
                <div key={field.name}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{field.label}</label>
                  <input
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #dde1e9', borderRadius: 4, fontSize: 14, color: '#1a2744', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: '#ffffff', border: '1px solid #dde1e9', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f0f2f7', borderBottom: '1px solid #dde1e9', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 24, backgroundColor: '#1a2744', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#c8a951', fontSize: 12, fontWeight: 700 }}>2</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Label Image</span>
          </div>
          <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} style={{ fontSize: 14, color: '#4a5568' }} />
            <button
              onClick={addToQueue}
              disabled={!files || files.length === 0}
              style={{ padding: '10px 24px', backgroundColor: files && files.length > 0 ? '#1a2744' : '#a0aab8', color: '#ffffff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: files && files.length > 0 ? 'pointer' : 'not-allowed', letterSpacing: '0.04em' }}
            >
              Add to Queue
            </button>
          </div>
        </section>

        <section style={{ backgroundColor: '#ffffff', border: '1px solid #dde1e9', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#f0f2f7', borderBottom: '1px solid #dde1e9', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, backgroundColor: '#1a2744', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#c8a951', fontSize: 12, fontWeight: 700 }}>3</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verification Queue</span>
              {queue.length > 0 && (
                <span style={{ backgroundColor: '#1a2744', color: '#c8a951', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>{queue.length}</span>
              )}
            </div>
            <button
              onClick={processQueue}
              disabled={pendingCount === 0 || processing}
              style={{ padding: '10px 28px', backgroundColor: pendingCount > 0 && !processing ? '#c8a951' : '#d1d5db', color: pendingCount > 0 && !processing ? '#1a2744' : '#9ca3af', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: pendingCount > 0 && !processing ? 'pointer' : 'not-allowed', letterSpacing: '0.04em' }}
            >
              {processing ? 'Processing…' : `Verify ${pendingCount > 0 ? `(${pendingCount})` : 'Queue'}`}
            </button>
          </div>

          <div style={{ padding: queue.length === 0 ? 40 : 0 }}>
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>??</div>
                No labels queued. Fill in the application data and upload a label image to begin.
              </div>
            ) : (
              queue.map((item, idx) => (
                <div key={item.id} style={{ borderBottom: idx < queue.length - 1 ? '1px solid #dde1e9' : 'none', padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: item.status === 'done' ? 16 : 0 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2744' }}>{item.brandName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.imageName}</div>
                    </div>
                    <div>
                      {item.status === 'pending' && <span style={{ padding: '4px 12px', backgroundColor: '#f0f2f7', color: '#6b7280', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Pending</span>}
                      {item.status === 'processing' && <span style={{ padding: '4px 12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>? Analyzing…</span>}
                      {item.status === 'done' && (() => {
                        const results = Object.values(item.result || {});
                        const passed = results.filter((r) => r.pass).length;
                        const total = results.length;
                        const allPass = passed === total;
                        return <span style={{ padding: '4px 12px', backgroundColor: allPass ? '#d1fae5' : '#fee2e2', color: allPass ? '#065f46' : '#991b1b', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{passed}/{total} Passed</span>;
                      })()}
                      {item.status === 'error' && <span style={{ padding: '4px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Error</span>}
                    </div>
                  </div>

                  {item.status === 'done' && item.result && (
                    <div style={{ border: '1px solid #dde1e9', borderRadius: 6, overflow: 'hidden' }}>
                      {Object.entries(item.result).map(([key, val], i, arr) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8f9fb', borderBottom: i < arr.length - 1 ? '1px solid #edf0f5' : 'none' }}>
                          <div style={{ flexShrink: 0, marginTop: 1 }}>
                            {val.pass
                              ? <span style={{ display: 'inline-flex', width: 20, height: 20, backgroundColor: '#d1fae5', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#065f46' }}>?</span>
                              : <span style={{ display: 'inline-flex', width: 20, height: 20, backgroundColor: '#fee2e2', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#991b1b' }}>?</span>
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{FIELD_LABELS[key] || key}</div>
                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{val.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#991b1b' }}>
                      {item.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #dde1e9', padding: '20px 32px', textAlign: 'center', marginTop: 40 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.05em' }}>TTB LABEL COMPLIANCE VERIFIER — PROTOTYPE — NOT FOR OFFICIAL USE</div>
      </footer>
    </div>
  );
}
