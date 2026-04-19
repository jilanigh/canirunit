import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/globals.css';

import Header        from './components/Header/Header';
import Footer        from './components/Footer/Footer';
import SpecsModal    from './components/SpecsModal/SpecsModal';
import Home          from './pages/Home/Home';
import GameList      from './pages/GameList/GameList';
import WhatWillRun   from './pages/WhatWillRun/WhatWillRun';
import GpuCompare    from './pages/GpuCompare/GpuCompare';
import AiAdvisor     from './pages/AiAdvisor/AiAdvisor';
import GameDetail    from './pages/GameDetail/GameDetail';
import ComingSoon    from './pages/ComingSoon/ComingSoon';
import LatencyTest   from './pages/LatencyTest/LatencyTest';
import FpsEstimator  from './pages/FpsEstimator/FpsEstimator';

import { useSpecs, SpecsContext } from './hooks/useSpecs';
import { AnimatePresence, motion } from 'framer-motion';

export default function App() {
  const { specs, redetect } = useSpecs();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDetectClick = () => {
    redetect();
    setModalOpen(true);
  };

  return (
    <SpecsContext.Provider value={specs}>
      <Router>
        <AppContent 
          specs={specs} 
          redetect={redetect} 
          modalOpen={modalOpen} 
          setModalOpen={setModalOpen} 
          handleDetectClick={handleDetectClick} 
        />
      </Router>
    </SpecsContext.Provider>
  );
}

function AppContent({ specs, redetect, modalOpen, setModalOpen, handleDetectClick }) {
  const location = useLocation();
  
  return (
    <>
      <Header onDetectClick={handleDetectClick} />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Routes location={location} key={location.pathname}>
            <Route path="/"              element={<Home specs={specs} onRescan={redetect} />} />
            <Route path="/games/:id"     element={<GameDetail specs={specs} />} />
            <Route path="/ai"            element={<AiAdvisor specs={specs} />} />
            <Route path="/games"         element={<GameList specs={specs} />} />
            <Route path="/rate"          element={<ComingSoon />} />
            <Route path="/what-will-run" element={<WhatWillRun specs={specs} />} />
            <Route path="/gpu-compare"   element={<GpuCompare />} />
            <Route path="/latency"       element={<LatencyTest />} />
            <Route path="/fps-estimator" element={<FpsEstimator />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>

      <Footer />

      {modalOpen && (
        <SpecsModal specs={specs} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
