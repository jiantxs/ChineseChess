/**
 * 将用户偏好难度 (1-10) 转换为 AI 搜索深度
 * 难度越高，搜索深度越大，AI 越强
 */
export function difficultyToDepth(difficulty: number): number {
  if (difficulty <= 3) return difficulty === 1 ? 1 : 2;
  if (difficulty <= 6) return difficulty <= 4 ? 3 : 4;
  if (difficulty <= 9) return difficulty <= 7 ? 5 : 6;
  return 8;
}