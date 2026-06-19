export interface ApiError {
  detail?: string;
  instance?: string;
  status?: number;
  title?: string;
  type?: string;
  errorCode?: string;
  additionalData?: Record<string, unknown>;
  customErrorMessages?: string[];
}
