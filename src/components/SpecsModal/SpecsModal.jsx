import { useEffect, useState } from 'react';
import styles from './SpecsModal.module.css';

export default function SpecsModal({ specs, onClose }) {
  const isAgent = specs.method === 'agent';
  const [pollCount, setPollCount] = useState(0);

  // Tick a counter so the waiting message animates and feels alive
  useEffect(() => {
    if (isAgent) return;
    const t = setInterval(() => setPollCount(n => n + 1), 2000);
    return () => clearInterval(t);
  }, [isAgent]);

  const dots = '.'.repeat((pollCount % 3) + 1).padEnd(3, '\u00a0');

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows = [
    {
      label: isAgent ? 'Graphics Card (GPU)' : 'GPU Renderer',
      value: specs.gpu || 'Run detection first',
    },
    {
      label: 'Dedicated VRAM',
      value: typeof specs.vram === 'number' ? `${specs.vram} GB` : (isAgent ? '—' : 'Not available in browser'),
      show: isAgent,
    },
    {
      label: isAgent ? 'Processor (CPU)' : 'CPU Logical Cores',
      value: isAgent && specs.cpuName
        ? `${specs.cpuName} (${specs.cores} cores)`
        : specs.cores
          ? `${specs.cores} logical threads`
          : '—',
    },
    {
      label: isAgent ? 'Installed Memory' : 'RAM (approx)',
      value: specs.ram ? `${specs.ram} GB` : 'Not available in this browser',
    },
    {
      label: 'Free Storage',
      value: typeof specs.storage === 'number' ? `${specs.storage} GB available` : '—',
      show: isAgent,
    },
    {
      label: 'Operating System',
      value: specs.os ? specs.os.split(' 10.0')[0] : '—',
    },
    {
      label: 'Shader Model',
      value: specs.shader || (isAgent ? '—' : 'Not available in browser'),
      show: isAgent,
    },
    {
      label: 'Detection Method',
      value: isAgent
        ? '✅ Native System Scanner (full accuracy)'
        : '⚠️ WebGL + Navigator APIs (limited)',
    },
  ].filter(r => r.show !== false);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <h2 className={styles.title}>
          Your PC Specs {isAgent ? '🚀' : '🔍'}
        </h2>
        <p className={styles.subtitle}>
          {isAgent
            ? 'Your hardware has been accurately detected via native system queries.'
            : 'Detected via WebGL and browser APIs. Results are limited by browser security.'}
        </p>

        <div className={styles.rows}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={`${styles.rowValue} ${isAgent ? styles.agentValue : ''}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {!isAgent && (
          <div className={styles.agentBanner}>
            <h3>Want 100% Accuracy?</h3>
            <p>
              Browsers restrict hardware access. Download the free desktop agent to
              instantly detect your true GPU, VRAM, CPU model, RAM, and storage.
            </p>

            <a
              href="/CYRI-Agent.exe"
              download="CYRI-Agent.exe"
              className={styles.downloadBtn}
            >
              ⬇ Download Desktop Agent <span className={styles.downloadMeta}>.exe · ~38 MB · Windows</span>
            </a>

            <p className={styles.downloadHint}>
              Run the downloaded <code>.exe</code> — it will automatically open this page with your full specs loaded.
            </p>

            <p className={styles.waitingText}>⏳ Listening for agent{dots}</p>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
