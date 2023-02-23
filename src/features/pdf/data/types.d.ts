export type IPdfMethod = 'auto' | 'custom';

export interface IPdfState {
  readyForPrint: boolean;
  pdfFormat: IPdfFormat | null;
  method: IPdfMethod | null;
  error: Error | null;
}

export interface IPdfActionRejected {
  error: Error | null;
}

export interface IPdfMethodFulfilled {
  method: IPdfMethod;
}

export interface IPdfFormatFulfilled {
  pdfFormat: IPdfFormat;
}

export interface IPdfFormat {
  excludedPages: string[];
  excludedComponents: string[];
}
