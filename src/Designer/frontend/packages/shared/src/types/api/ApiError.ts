export interface ApiError {
  detail?: string;
  instance?: string;
  status?: number;
  title?: string;
  type?: string;
  errorCode?: string;
  values?: Record<string, unknown>;
  customErrorMessages?: string[];
}
