import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const isFileTooLarge = (error: AxiosError) => error.response.status === ServerCodes.TooLargeContent;

export const useAddImageMutation = (org: string, app: string) => {
  const { addImage } = useServicesContext();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (form: FormData) => addImage(org, app, form),
    onError: (error: AxiosError) => {
      if (isFileTooLarge(error)) toast.error(t('ux_editor.upload_file_error_too_large'));
    },
    meta: {
      hideDefaultError: (error: AxiosError) => isFileTooLarge(error),
    },
  });
};
