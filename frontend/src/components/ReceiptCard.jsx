import React, { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

export default function ReceiptCard({ receipt, submissionId, version, timestamp, files = [] }) {
  const [copied, setCopied] = useState(false);

  const copyReceipt = () => {
    navigator.clipboard.writeText(receipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(59, 130, 246, 0.08)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      margin: '1.25rem 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>
          <ShieldCheck size={20} />
          <span>Cryptographic Submission Receipt</span>
        </div>
        <button onClick={copyReceipt} className="btn btn-sm btn-secondary" style={{ gap: '0.35rem' }}>
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy Receipt'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>RECEIPT IDENTIFIER</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {receipt}
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>SUBMISSION VERSION</div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            Version {version || 1}
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TIMESTAMP (UTC)</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '2px' }}>
            {timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            AUTHENTICATED FILE INTEGRITY CHECKSUMS (SHA-256):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{f.name || f.original_name}</span>
                <span className="hash-pill">
                  {f.sha256 || f.sha256_hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
