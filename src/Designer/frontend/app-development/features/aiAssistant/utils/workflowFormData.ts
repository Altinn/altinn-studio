import type { UserAttachment } from '@designer/assistant';

type WorkflowStart = {
  goal: string;
  branch: string;
  allowAppChanges: boolean;
  attachments?: UserAttachment[];
};

// Sends the attachments as files, so that the request carries their bytes rather than base64 text.
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
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}
