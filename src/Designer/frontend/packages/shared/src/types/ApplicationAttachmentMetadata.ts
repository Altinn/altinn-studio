export interface ApplicationAttachmentMetadata {
  id: string;
  taskId?: string;
  taskIds?: string[];
  maxCount: number;
  minCount: number;
  maxSize: number;
  fileType?: string;
  enableFileScan?: boolean;
}
