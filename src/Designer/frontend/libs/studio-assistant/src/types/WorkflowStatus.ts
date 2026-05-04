export interface WorkflowStatus {
  isActive: boolean;
  sessionId?: string;
  currentStep?: string;
  message?: string;
  lastCompletedAt?: Date;
  filesChanged?: string[];
}
