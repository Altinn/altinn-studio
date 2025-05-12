import React from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import { useAddOptionListMutation } from 'app-shared/hooks/mutations';
import { Trans, useTranslation } from 'react-i18next';
import { StudioFileUploader, StudioNativeSelect, StudioSpinner } from '@studio/components-legacy';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { FileNameErrorResult, FileNameUtils } from '@studio/pure-functions';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import { toast } from 'react-toastify';
import classes from './SelectTab.module.css';

export function SelectTab<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  const onSubmit = (file: File) => {
    const fileNameError = FileNameUtils.findFileNameError(
      FileNameUtils.removeExtension(file.name),
      optionListIds,
    );
    if (fileNameError) handleInvalidFileName(fileNameError);
    else handleUpload(file);
  };

  const handleUpload = (file: File) => {
    uploadOptionList(file, {
      onSuccess: () => {
        handleOptionsIdChange(FileNameUtils.removeExtension(file.name));
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
      },
      onError: (error: AxiosError<ApiError>) => {
        if (isErrorUnknown(error)) {
          toast.error(t('ux_editor.modal_properties_code_list_upload_generic_error'));
        }
      },
    });
  };

  const handleInvalidFileName = (fileNameError: FileNameErrorResult) => {
    switch (fileNameError) {
      case FileNameErrorResult.NoRegExMatch:
        return toast.error(t('validation_errors.file_name_invalid'));
      case FileNameErrorResult.FileExists:
        return toast.error(t('validation_errors.upload_file_name_occupied'));
    }
  };

  return (
    <div className={classes.container}>
      <OptionListSelector component={component} handleOptionsIdChange={handleOptionsIdChange} />
      <StudioFileUploader
        accept='.json'
        variant={'tertiary'}
        uploaderButtonText={t('ux_editor.options.upload_title')}
        onSubmit={onSubmit}
      />
      <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more_static'}>
        <a
          className={classes.linkStaticCodeLists}
          href={altinnDocsUrl({
            relativeUrl: 'altinn-studio/guides/development/options/sources/static/',
          })}
          target='_newTab'
          rel='noopener noreferrer'
        />
      </Trans>
    </div>
  );
}

type OptionListSelectorProps<T extends SelectionComponentType> = {
  handleOptionsIdChange: (optionsId: string) => void;
} & Pick<IGenericEditComponent<T>, 'component'>;

function OptionListSelector<T extends SelectionComponentType>({
  component,
  handleOptionsIdChange,
}: OptionListSelectorProps<T>): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status } = useOptionListIdsQuery(org, app);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      );
    case 'error':
      return (
        <ErrorMessage>
          {t('ux_editor.modal_properties_fetch_option_list_error_message')}
        </ErrorMessage>
      );
    case 'success':
      return (
        <OptionListSelectorWithData
          optionListIds={optionListIds}
          component={component}
          handleOptionsIdChange={handleOptionsIdChange}
        />
      );
  }
}

type OptionListSelectorWithDataProps<T extends SelectionComponentType> = {
  optionListIds: string[];
  handleOptionsIdChange: (optionsId: string) => void;
} & Pick<IGenericEditComponent<T>, 'component'>;

function OptionListSelectorWithData<T extends SelectionComponentType>({
  optionListIds,
  component,
  handleOptionsIdChange,
}: OptionListSelectorWithDataProps<T>): React.ReactNode {
  const { t } = useTranslation();

  if (!optionListIds.length) return null;
  return (
    <FormField
      key={component.id}
      id={component.id}
      label={t('ux_editor.modal_properties_code_list_id')}
      onChange={handleOptionsIdChange}
      value={component.optionsId}
      propertyPath={`${component.propertyPath}/properties/optionsId`}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          size='small'
          onChange={(e) => fieldProps.onChange(e.target.value)}
          value={fieldProps.value}
        >
          <option hidden value=''>
            {t('ux_editor.modal_properties_code_list_helper')}
          </option>
          {optionListIds.map((optionListId) => (
            <option key={optionListId} value={optionListId}>
              {optionListId}
            </option>
          ))}
        </StudioNativeSelect>
      )}
    />
  );
}
