export type NavigationBarPage = "about" | "policy" | "deploy" | "migration";

export interface LanguageString {
  nb?: string;
  nn?: string;
  en?: string;
}

export interface DeployError {
  message: string;
  pageWithError: "about" | "policy";
}

export type Translation = "none" | "title" | "description" | "rightDescription";
