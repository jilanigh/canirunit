import { useState } from 'react';
import { GPU_SCORES, getGpuScore } from '../../data/gpuScoring';
import styles from './GpuCompare.module.css';

function gpuCapabilities(gpuName, score) {
  const g = gpuName.toLowerCase();
  const hasRayTracing = g.includes('rtx') || g.includes('rx 6') || g.includes('rx 7') || g.includes('arc');
  const hasDLSS = g.includes('rtx');
  const hasFSR  = g.includes('rx') || g.includes('rtx') || g.includes('gtx 16') || g.includes('gtx 10');

  return {
    gaming4k   : score > 20000 ? 'Ultra' : score > 13000 ? 'High' : score > 8000 ? 'Medium' : 'Low/Not Recommended',
    gaming1440p: score > 10000 ? 'Ultra' : score > 6000  ? 'High' : score > 3000 ? 'Medium' : 'Low',
    rayTracing : hasRayTracing ? (score > 15000 ? 'Full @ 4K'  : 'Supported') : 'Not Supported',
    dlss       : hasDLSS ? 'Supported' : 'Not Supported',
    fsr        : hasFSR  ? 'Supported' : 'Not Supported',
    vramClass  : score > 18000 ? 'Enthusiast (16 GB+)' : score > 10000 ? 'High-End (8–12 GB)' : score > 5000 ? 'Mainstream (6–8 GB)' : 'Entry (4 GB)',
  };
}

const CAP_LABELS = {
  gaming4k   : '4K Gaming',
  gaming1440p: '1440p Gaming',
  rayTracing : 'Ray Tracing',
  dlss       : 'DLSS/XeSS',
  fsr        : 'AMD FSR',
  vramClass  : 'VRAM Class',
};

export default function GpuCompare() {
  const gpuOptions = Object.keys(GPU_SCORES).sort();
  const [gpu1, setGpu1] = useState('RTX 4090');
  const [gpu2, setGpu2] = useState('RTX 3060');

  const score1 = getGpuScore(gpu1);
  const score2 = getGpuScore(gpu2);
  const cap1   = gpuCapabilities(gpu1, score1);
  const cap2   = gpuCapabilities(gpu2, score2);

  const rawDiff   = ((score1 - score2) / (score2 || 1) * 100).toFixed(1);
  const percentage = Math.abs(rawDiff);
  const winner    = score1 >= score2 ? gpu1 : gpu2;
  const isTie     = score1 === score2;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Performance Lab</div>
        <h1 className={styles.title}>GPU <span className={styles.accent}>Battles</span></h1>
        <p className={styles.subtitle}>Battle two graphics cards to see which one rules the frame rate.</p>
      </header>

      <div className={styles.arena}>
        {/* GPU 1 */}
        <div className={`${styles.card} ${score1 >= score2 && !isTie ? styles.winnerCard : ''}`}>
          <div className={styles.label}>Challenger A</div>
          <select value={gpu1} onChange={(e) => setGpu1(e.target.value)} className={styles.select}>
            {gpuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <div className={styles.score}>{score1.toLocaleString()}</div>
          <div className={styles.rank}>Performance Index</div>
        </div>

        <div className={styles.vs}>VS</div>

        {/* GPU 2 */}
        <div className={`${styles.card} ${score2 > score1 ? styles.winnerCard : ''}`}>
          <div className={styles.label}>Challenger B</div>
          <select value={gpu2} onChange={(e) => setGpu2(e.target.value)} className={styles.select}>
            {gpuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <div className={styles.score}>{score2.toLocaleString()}</div>
          <div className={styles.rank}>Performance Index</div>
        </div>
      </div>

      <div className={styles.result}>
        {isTie ? (
          <h2>It&apos;s a TIE! Both cards have identical performance indices.</h2>
        ) : (
          <h2>
            <span className={styles.highlight}>{winner}</span> is {percentage}% faster!
          </h2>
        )}
      </div>

      {/* Side-by-side capability comparison */}
      <div className={styles.capabilityGrid}>
        {Object.keys(CAP_LABELS).map(key => (
          <div key={key} className={styles.capCard}>
            <h3>{CAP_LABELS[key]}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.4rem' }}>
              <span style={{ color: score1 >= score2 ? 'var(--accent, #00d4ff)' : 'inherit', fontSize: '0.85rem' }}>
                {cap1[key]}
              </span>
              <span style={{ color: '#555', fontSize: '0.75rem', alignSelf: 'center' }}>vs</span>
              <span style={{ color: score2 > score1 ? 'var(--accent, #00d4ff)' : 'inherit', fontSize: '0.85rem', textAlign: 'right' }}>
                {cap2[key]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
