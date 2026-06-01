export const jobStatusLabel: Record<string, string> = {
  pending: '等待中',
  running: '训练中',
  completed: '已完成',
  failed: '失败',
};

export const topologyLabel: Record<string, string> = {
  rectangular: '矩形',
  hexagonal: '六边形',
};

export const neighborhoodLabel: Record<string, string> = {
  gaussian: '高斯',
  mexican_hat: '墨西哥帽',
  bubble: '气泡',
  triangle: '三角',
};

export const trainingModeLabel: Record<string, string> = {
  online: '在线训练',
  batch_offline: '批量离线',
  batch_offline_fast: '批量加速 (Numba)',
};

export const weightInitLabel: Record<string, string> = {
  pca: 'PCA 初始化',
  random: '随机初始化',
};

export const activationDistanceLabel: Record<string, string> = {
  euclidean: '欧氏距离',
  cosine: '余弦距离',
  manhattan: '曼哈顿距离',
  chebyshev: '切比雪夫距离',
};

export const activationDistanceHint: Record<string, string> = {
  euclidean: '最常用，适合量纲相近的连续数值特征（如温度、压力）。',
  cosine: '关注向量方向，适合高维或稀疏数据（如文本特征）。',
  manhattan: '对各维度差异求和，对异常值相对稳健。',
  chebyshev: '取各维度最大差异，关注最坏情况下的距离。',
};
