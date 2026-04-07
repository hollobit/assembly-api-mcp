/**
 * API 응답 시간 모니터링
 *
 * API 호출의 지속 시간, 성공률, 느린 호출을 추적합니다.
 */

import { mcpLogger } from "./mcp-logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiCallMetric {
  readonly apiCode: string;
  readonly durationMs: number;
  readonly timestamp: number;
  readonly success: boolean;
}

export interface MonitorStats {
  readonly totalCalls: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly avgDurationMs: number;
  readonly slowCallCount: number;
}

export interface Monitor {
  readonly record: (metric: ApiCallMetric) => void;
  readonly stats: () => MonitorStats;
  readonly slowCalls: () => readonly ApiCallMetric[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOW_THRESHOLD_MS = 3000;
const MAX_METRICS_STORED = 1000;
const MAX_SLOW_CALLS_STORED = 100;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMonitor(): Monitor {
  const metrics: ApiCallMetric[] = [];
  const slowCallsList: ApiCallMetric[] = [];
  let totalCalls = 0;
  let successCount = 0;
  let totalDurationMs = 0;

  function record(metric: ApiCallMetric): void {
    // Sliding window: drop oldest when at capacity
    if (metrics.length >= MAX_METRICS_STORED) {
      const removed = metrics.shift()!;
      if (removed.success) successCount -= 1;
      totalDurationMs -= removed.durationMs;
    }

    metrics.push(metric);
    totalCalls += 1;
    totalDurationMs += metric.durationMs;
    if (metric.success) successCount += 1;

    if (metric.durationMs > SLOW_THRESHOLD_MS) {
      if (slowCallsList.length >= MAX_SLOW_CALLS_STORED) {
        slowCallsList.shift();
      }
      slowCallsList.push(metric);

      mcpLogger.log(
        "warning",
        "monitor",
        `느린 API 호출: ${metric.apiCode} — ${String(metric.durationMs)}ms`,
      );
    }
  }

  function stats(): MonitorStats {
    const windowSize = metrics.length;
    return {
      totalCalls,
      successCount,
      failureCount: windowSize - successCount,
      avgDurationMs: windowSize > 0 ? Math.round(totalDurationMs / windowSize) : 0,
      slowCallCount: slowCallsList.length,
    };
  }

  function slowCalls(): readonly ApiCallMetric[] {
    return slowCallsList;
  }

  return { record, stats, slowCalls };
}
