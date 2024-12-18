import React from 'react';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../../hooks/queries/useOptionListIdsQuery';
import { useAddOptionListMutation } from 'app-shared/hooks/mutations';
import { useTranslation } from 'react-i18next';
import { StudioFileUploader } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FileNameUtils } from '@studio/pure-functions';
import { findFileNameError } from './utils/findFileNameError';
import type { FileNameError } from './utils/findFileNameError';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import { handleOptionsChange, updateComponentOptionsId } from '../utils/utils';

type EditOptionListProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function OptionListUploader({ component, handleComponentChange }: EditOptionListProps) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => !error.response.data.errorCode,
  });

  const onSubmit = (file: File) => {
    const fileNameError = findFileNameError(optionListIds, file.name);
    if (fileNameError) {
      handleInvalidFileName(fileNameError);
    } else {
      handleUpload(file);
    }
  };

  const handleUpload = (file: File) => {
    uploadOptionList(file, {
      onSuccess: () => {
        const optionsId = FileNameUtils.removeExtension(file.name);
        const updatedComponent = updateComponentOptionsId(component, optionsId);
        handleOptionsChange(updatedComponent, handleComponentChange);
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
      },

      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode) {
          toast.error(`${t('ux_editor.modal_properties_code_list_upload_generic_error')}`);
        }
      },
    });
  };

  const handleInvalidFileName = (fileNameError: FileNameError) => {
    switch (fileNameError) {
      case 'invalidFileName':
        return toast.error(t('validation_errors.file_name_occupied'));
      case 'fileExists':
        return toast.error(t('validation_errors.upload_file_name_occupied'));
    }
  };

  return (
    <StudioFileUploader
      accept='.json'
      variant={'tertiary'}
      uploaderButtonText={t('ux_editor.options.upload_title')}
      onSubmit={onSubmit}
    />
  );
}
