/**
 * 월간 API 호출 횟수 제한 추적
 *
 * 열린국회정보 개발계정 기본 제한: 10,000건/월
 * 80% 소진 시 MCP 클라이언트와 stderr에 경고를 출력합니다.
 */

import { mcpLogger } from "./mcp-logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimiterState {
  readonly count: number;
  readonly monthlyLimit: number;
  readonly remaining: number;
  readonly isNearLimit: boolean;
  readonly resetMonth: string;
}

export interface RateLimiter {
  readonly increment: () => void;
  readonly remaining: () => number;
  readonly isNearLimit: () => boolean;
  readonly reset: () => void;
  readonly state: () => RateLimiterState;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MONTHLY_LIMIT = 10_000;
const WARN_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentMonth(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRateLimiter(
  monthlyLimit: number = DEFAULT_MONTHLY_LIMIT,
): RateLimiter {
  let count = 0;
  let resetMonth = currentMonth();
  let warned = false;

  function autoReset(): void {
    const now = currentMonth();
    if (now !== resetMonth) {
      count = 0;
      resetMonth = now;
      warned = false;
    }
  }

  function increment(): void {
    autoReset();
    count += 1;

    if (!warned && count >= monthlyLimit * WARN_THRESHOLD) {
      warned = true;
      mcpLogger.log(
        "warning",
        "rate-limiter",
        `월간 API 호출 ${String(count)}/${String(monthlyLimit)} — 80% 이상 소진`,
      );
    }

    if (count >= monthlyLimit) {
      mcpLogger.log(
        "error",
        "rate-limiter",
        `월간 API 호출 한도 도달 (${String(count)}/${String(monthlyLimit)})`,
      );
    }
  }

  function remaining(): number {
    autoReset();
    return Math.max(0, monthlyLimit - count);
  }

  function isNearLimit(): boolean {
    autoReset();
    return count >= monthlyLimit * WARN_THRESHOLD;
  }

  function reset(): void {
    count = 0;
    resetMonth = currentMonth();
    warned = false;
  }

  function state(): RateLimiterState {
    autoReset();
    return {
      count,
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - count),
      isNearLimit: count >= monthlyLimit * WARN_THRESHOLD,
      resetMonth,
    };
  }

  return { increment, remaining, isNearLimit, reset, state };
}
