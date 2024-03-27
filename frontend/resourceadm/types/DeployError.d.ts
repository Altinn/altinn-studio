export interface DeployError {
  message: string;
  pageWithError?: 'about' | 'policy';
  numberOfErrors?: number;
}
