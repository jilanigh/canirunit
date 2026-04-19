import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SpecsBar.module.css';
import SpecsModal from '../SpecsModal/SpecsModal';
import { useSpecsContext } from '../../hooks/useSpecs';

export default function SpecsBar() {
  const { t, i18n } = useTranslation();
  const { specs, updateManualSpecs, redetect } = useSpecsContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!specs) return null;

  const isAgent = specs.method === 'agent';

  const chips = [
    {
      label: t('specs.gpu'),
      value: specs.gpu ? (specs.gpu.length > 30 ? specs.gpu.substring(0, 30) + '...' : specs.gpu) : '—',
    },
    {
      label: t('specs.ram'),
      value: specs.ram ? `${specs.ram} GB` : 'N/A',
    },
    {
      label: t('specs.cpu'),
      value: specs.cpuName 
        ? (specs.cpuName.length > 25 ? specs.cpuName.substring(0, 25) + '...' : specs.cpuName)
        : (specs.cores ? `${specs.cores} ${t('specs.cores')}` : '—'),
    },
    { label: t('specs.os'), value: specs.os || '—' },
  ];

  return (
    <>
      <div className={styles.bar} id="specs">
        <div className={styles.inner}>
          <div className={styles.statusGroup}>
            <span className={`${styles.statusDot} ${isAgent ? styles.live : ''}`}></span>
            <span className={styles.label}>
              {isAgent ? t('specs.native_scan') : t('specs.browser_detection')}
            </span>
          </div>

          <div className={styles.chipsContainer}>
            {chips.map((chip) => (
              <div key={chip.label} className={styles.chip}>
                <span className={styles.chipLabel}>{chip.label}</span>
                <span className={styles.chipValue} title={chip.value}>{chip.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => setIsModalOpen(true)}>
              {t('specs.edit_specs')}
            </button>
            
            <button className={styles.scanBtn} onClick={redetect}>
              {specs.detected ? t('specs.scan_again') : t('specs.detect')}
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <SpecsModal 
          currentSpecs={specs} 
          onSave={updateManualSpecs} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}
