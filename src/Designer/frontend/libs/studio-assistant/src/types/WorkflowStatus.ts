/**
 * One step in the agent's activity trail. Each status event from the backend
 * with a distinct message becomes a step. The latest step is the active one;
 * older steps render as completed (muted dot, frozen timestamp).
 */
export interface TrailStep {
  id: string;
  message: string;
  /** Milliseconds since workflow start when this step opened. */
  offsetMs: number;
  /**
   * Stable id of the model's tool_use block when the step originated from
   * a tool call. The backend emits a placeholder ("Leser fil") while the
   * tool input streams, then a landed message ("Leser App/ui/Side1.json")
   * with the same id — matching on this lets us upgrade the step in place
   * instead of appending a duplicate row.
   */
  toolUseId?: string;
}

export interface WorkflowStatus {
  isActive: boolean;
  sessionId?: string;
  currentStep?: string;
  message?: string;
  steps?: TrailStep[];
  lastCompletedAt?: Date;
  filesChanged?: string[];
}
