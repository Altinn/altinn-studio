import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';

export const useCanSubmitForm = (): { canSubmit: boolean; busyWithId?: string; message?: string } => {
  const { langAsString } = useLanguage();
  const submittingId = useAppSelector((state) => state.formData.submittingId);
  const confirmingId = useAppSelector((state) => state.process.completingId);
  const attachments = useAppSelector((state) => state.attachments.attachments);

  const attachmentsPending = Object.values(attachments).some((fileUploader) =>
    fileUploader.some((attachment) => !attachment.uploaded || attachment.updating || attachment.deleting),
  );

  const busyWithId = submittingId || confirmingId || undefined;
  const canSubmit = !busyWithId && !attachmentsPending;
  const message = attachmentsPending ? langAsString('general.wait_for_attachments') : undefined;

  return { canSubmit, busyWithId, message };
};
