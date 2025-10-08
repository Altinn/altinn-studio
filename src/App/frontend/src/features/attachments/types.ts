export type FileScanResult = 'NotApplicable' | 'Pending' | 'Clean' | 'Infected';

export const FileScanResults = {
  NotApplicable: 'NotApplicable',
  Pending: 'Pending',
  Clean: 'Clean',
  Infected: 'Infected',
} as const satisfies Record<string, FileScanResult>;

export type AttachmentProcessingState = 'uploading' | 'deleting' | 'updating';

export type AttachmentState = FileScanResult | AttachmentProcessingState | 'ready';

export interface AttachmentStateInfo {
  hasPending: boolean;
  state: AttachmentState;
}
