/**
 * 도구 공통 헬퍼 함수
 */

/**
 * 도구 에러를 MCP 응답 형식으로 변환합니다.
 */
export function formatToolError(err: unknown): { content: { type: "text"; text: string }[]; isError: true } {
  const message = err instanceof Error ? err.message : String(err);
  const code = message.includes('API_KEY') ? 'AUTH_ERROR'
    : message.includes('rate') ? 'RATE_LIMIT'
    : message.includes('timeout') ? 'TIMEOUT'
    : 'UNKNOWN';
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message, code }) }],
    isError: true,
  };
}
