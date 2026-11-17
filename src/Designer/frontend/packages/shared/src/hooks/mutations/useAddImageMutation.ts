import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { HttpError } from 'app-shared/utils/networking';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const isFileTooLarge = (error: HttpError) => error.response?.status === ServerCodes.TooLargeContent;

export const useAddImageMutation = (org: string, app: string) => {
  const { addImage } = useServicesContext();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (form: FormData) => addImage(org, app, form),
    onError: (error: HttpError) => {
      if (isFileTooLarge(error)) toast.error(t('ux_editor.upload_file_error_too_large'));
    },
    meta: {
      hideDefaultError: (error: HttpError) => isFileTooLarge(error),
    },
  });
};
