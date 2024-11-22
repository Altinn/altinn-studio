import { FileNameValidationResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export function useValidateFileName() {
  const { t } = useTranslation();

  const handleInvalidUploadedFileName = (fileNameError: FileNameValidationResult) => {
    switch (fileNameError) {
      case FileNameValidationResult.NoRegExMatch:
        return toast.error(t('validation_errors.file_name_invalid'));
      case FileNameValidationResult.FileExists:
        return toast.error(t('validation_errors.upload_file_name_occupied'));
      default:
        return null;
    }
  };

  const getInvalidInputFileNameErrorMessage = (fileNameError: FileNameValidationResult) => {
    switch (fileNameError) {
      case FileNameValidationResult.FileNameIsEmpty:
        return t('validation_errors.required');
      case FileNameValidationResult.NoRegExMatch:
        return t('validation_errors.file_name_invalid');
      case FileNameValidationResult.FileExists:
        return t('validation_errors.file_name_occupied');
      default:
        return '';
    }
  };

  return { handleInvalidUploadedFileName, getInvalidInputFileNameErrorMessage };
}
