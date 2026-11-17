export const attachmentMutationKeys = {
  all: ['attachments'] as const,
  upload: () => [...attachmentMutationKeys.all, 'upload'] as const,
  update: () => [...attachmentMutationKeys.all, 'update'] as const,
  remove: () => [...attachmentMutationKeys.all, 'remove'] as const,
};
