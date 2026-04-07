/**
 * MCP Logging 브릿지
 *
 * McpServer.sendLoggingMessage를 래핑하여,
 * 도구/모니터/Rate Limiter가 server 인스턴스에 직접 의존하지 않고
 * MCP 클라이언트에 로그를 전달할 수 있게 합니다.
 *
 * MCP 클라이언트가 연결되지 않은 상태에서도 안전하게 호출 가능하며,
 * 항상 stderr에도 동시에 출력합니다 (이중 출력).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type McpLogLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

export type McpLogSender = (params: {
  readonly level: McpLogLevel;
  readonly logger?: string;
  readonly data: unknown;
}) => Promise<void>;

export interface McpLogger {
  /** MCP 클라이언트에 로그를 전송하고 stderr에도 출력 */
  readonly log: (level: McpLogLevel, logger: string, data: string) => void;
  /** McpServer.sendLoggingMessage를 연결 */
  readonly attach: (sender: McpLogSender) => void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMcpLogger(): McpLogger {
  let sender: McpLogSender | undefined;

  function attach(s: McpLogSender): void {
    sender = s;
  }

  function log(level: McpLogLevel, logger: string, data: string): void {
    // 1) 항상 stderr 출력 (서버 진단용)
    process.stderr.write(`[assembly:${logger}] ${data}\n`);

    // 2) MCP 클라이언트에 전달 (연결 시에만, 실패 무시)
    if (sender) {
      sender({ level, logger, data }).catch(() => {
        // MCP 전송 실패는 무시 — 클라이언트 미연결 등
      });
    }
  }

  return { log, attach };
}

/** 싱글턴 인스턴스 — 전역에서 import하여 사용 */
export const mcpLogger = createMcpLogger();
