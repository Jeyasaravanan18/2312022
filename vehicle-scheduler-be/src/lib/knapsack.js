'use strict';

function normalizeTask(task) {
  const id = task.TaskID || task.taskId || task.ID || task.id;
  const duration = Number(task.Duration ?? task.duration ?? 0);
  const impact = Number(task.Impact ?? task.impact ?? 0);
  return {
    id: String(id || ''),
    duration: Math.max(0, Math.floor(duration)),
    impact: Math.max(0, Math.floor(impact)),
    raw: task,
  };
}

function solveKnapsack(tasks, capacity) {
  const budget = Math.max(0, Math.floor(Number(capacity) || 0));
  const items = tasks.map(normalizeTask).filter((task) => task.id && task.duration >= 0 && task.impact >= 0);
  const n = items.length;

  if (n === 0 || budget === 0) {
    return {
      totalImpact: 0,
      totalDuration: 0,
      selected: [],
    };
  }

  const dp = Array.from({ length: n + 1 }, () => Array(budget + 1).fill(0));

  for (let i = 1; i <= n; i += 1) {
    const { duration, impact } = items[i - 1];
    for (let w = 0; w <= budget; w += 1) {
      dp[i][w] = dp[i - 1][w];
      if (duration <= w) {
        dp[i][w] = Math.max(dp[i][w], impact + dp[i - 1][w - duration]);
      }
    }
  }

  const selected = [];
  let w = budget;
  for (let i = n; i > 0; i -= 1) {
    if (dp[i][w] !== dp[i - 1][w]) {
      const item = items[i - 1];
      selected.push(item);
      w -= item.duration;
    }
  }

  selected.reverse();

  return {
    totalImpact: dp[n][budget],
    totalDuration: selected.reduce((sum, task) => sum + task.duration, 0),
    selected,
  };
}

module.exports = {
  normalizeTask,
  solveKnapsack,
};
