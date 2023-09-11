export type NavigationBarPage = 'about' | 'policy' | 'deploy' | 'migration';

export interface SupportedLanguage {
  nb?: string;
  nn?: string;
  en?: string;
}

export interface DeployError {
  message: string;
  pageWithError: 'about' | 'policy';
}

export type Translation = 'none' | 'title' | 'description' | 'rightDescription';

export type EnvironmentType = 'AT21' | 'AT22' | 'AT23' | 'AT24' | 'TT02' | 'PROD';

export interface ServiceType {
  name: string;
}
