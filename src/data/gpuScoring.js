export const GPU_SCORES = {
  // Ultra High End
  'RTX 4090': 35000, 'RX 7900 XTX': 31000, 'RTX 4080': 27000, 'RX 7900 XT': 25000,
  'RTX 3090 Ti': 22000, 'RTX 4070 Ti': 21000, 'RTX 3090': 20000, 'RX 6950 XT': 19500,

  // High End
  'RTX 4070': 18000, 'RTX 3080': 17500, 'RX 6800 XT': 16000, 'RTX 3070 Ti': 15000,
  'RX 7800 XT': 14800, 'RTX 4060 Ti': 14000, 'RTX 3070': 13500, 'RX 6700 XT': 12000,
  'RX 6800': 11500,
  
  // Mid Range
  'RTX 3060 Ti': 11000, 'RTX 4060': 10500, 'RX 7600': 9500, 'RTX 2080 Ti': 10000, 
  'RTX 2080': 9000, 'RTX 4050': 9000, 'RTX 3060': 8500, 'RX 6600 XT': 8200,
  'RTX 2070 Super': 8500, 'RTX 2070': 7500, 'RX 6600': 7000, 'RTX 3050 Ti': 6500,
  'RTX 3050': 6000, 'RTX 2060': 6000, 'RX 5700 XT': 7500,
  
  // Mobile/Laptop Variants (Generally ~20% slower than desktop equivalents)
  'RTX 4070 Laptop': 13000, 'RTX 3070 Laptop': 10000, 'RTX 4060 Laptop': 9000,
  'RTX 3060 Laptop': 7500, 'RTX 4050 Laptop': 7000, 'RTX 3050 Ti Laptop': 5500,
  'RTX 3050 Laptop': 5000, 'RTX 2060 Laptop': 5000,
  
  // Entry Level / Older
  'GTX 1660 Ti': 5500, 'GTX 1660 Super': 5200, 'GTX 1660': 4800,
  'GTX 1070 Ti': 5500, 'GTX 1070': 5000, 'GTX 1080 Ti': 8500, 'GTX 1080': 7000,
  'GTX 1650 Ti': 4000, 'GTX 1650 Super': 4500, 'GTX 1650': 3500,
  'GTX 1060 6GB': 4200, 'GTX 1060 3GB': 3800, 'GTX 1060': 4000,
  'RX 590': 4000, 'RX 580': 3200, 'RX 570': 2800,
  'GTX 1050 Ti': 2500, 'GTX 1050': 2000, 'GTX 970': 3000, 'GTX 980': 4000,
  'GTX 750 Ti': 1200,
  'UHD Graphics 770': 800, 'UHD Graphics 630': 500,
  'Iris Xe Graphics': 1500, 'Radeon Graphics': 1200, 'Intel Iris': 800,
};

export function getGpuScore(gpuString) {
  if (!gpuString) return 0;
  const normalizedStr = gpuString.toLowerCase();
  
  // Custom sorting to match specific strings first (e.g. "Laptop" before generic)
  const sortedKeys = Object.keys(GPU_SCORES).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (normalizedStr.includes(key.toLowerCase())) {
      return GPU_SCORES[key];
    }
  }

  // Fallback heuristic
  if (normalizedStr.includes('rtx 40')) return 15000;
  if (normalizedStr.includes('rtx 30')) return 8000;
  if (normalizedStr.includes('rtx 20')) return 6000;
  if (normalizedStr.includes('gtx 16')) return 4000;
  if (normalizedStr.includes('gtx 10')) return 3000;
  if (normalizedStr.includes('rx 7')) return 12000;
  if (normalizedStr.includes('rx 6')) return 8000;

  return 800; 
}

export function compareGpu(userGpu, requiredGpu) {
  const userScore = getGpuScore(userGpu);
  const reqScore = getGpuScore(requiredGpu);
  return userScore >= reqScore;
}
