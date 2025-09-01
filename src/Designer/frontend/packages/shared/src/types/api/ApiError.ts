export interface ApiError {
  detail?: string;
  instance?: string;
  status?: number;
  title?: string;
  type?: string;
  errorCode?: string;
  customErrorMessages?: string[];
}
