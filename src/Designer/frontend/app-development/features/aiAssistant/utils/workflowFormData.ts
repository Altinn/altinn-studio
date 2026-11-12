import type { UserAttachment } from '@designer/assistant';

type WorkflowStart = {
  goal: string;
  branch: string;
  allowAppChanges: boolean;
  attachments?: UserAttachment[];
};

// The form contains the bytes of each attachment, not base64 text.
export function createWorkflowFormData({
  goal,
  branch,
  allowAppChanges,
  attachments = [],
}: WorkflowStart): FormData {
  const formData = new FormData();
  formData.append('goal', goal);
  formData.append('branch', branch);
  formData.append('allowAppChanges', String(allowAppChanges));
  attachments.forEach((attachment) =>
    formData.append('attachments', toBlob(attachment), attachment.name),
  );
  return formData;
}

// The composer keeps each attached file as a base64 data URL.
function toBlob({ dataBase64 = '', mimeType }: UserAttachment): Blob {
  const base64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
