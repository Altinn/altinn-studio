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

type EditOptionListProps<T extends SelectionComponentType> = {
  setComponentHasOptionList: (value: boolean) => void;
} & Pick<IGenericEditComponent<T>, 'component' | 'handleComponentChange'>;

export function OptionListUploader<T extends SelectionComponentType>({
  setComponentHasOptionList,
  component,
  handleComponentChange,
}: EditOptionListProps<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => !error.response.data.errorCode,
  });

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId,
    });

    setComponentHasOptionList(true);
  };

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
        handleOptionsIdChange(FileNameUtils.removeExtension(file.name));
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
        return toast.error(t('ux_editor.modal_properties_code_list_filename_error'));
      case 'fileExists':
        return toast.error(t('ux_editor.modal_properties_code_list_upload_duplicate_error'));
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
