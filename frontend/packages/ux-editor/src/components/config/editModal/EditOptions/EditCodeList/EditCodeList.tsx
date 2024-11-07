import React from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useOptionListIdsQuery } from '../../../../../hooks/queries/useOptionListIdsQuery';
import { useAddOptionListMutation } from '../../../../../hooks/mutations/useAddOptionListMutation';
import { useTranslation, Trans } from 'react-i18next';
import { StudioFileUploader, StudioNativeSelect, StudioSpinner } from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import { removeExtension } from 'app-shared/utils/filenameUtils';
import { findFileNameError } from './findFileNameError';
import type { FileNameError } from './findFileNameError';
import type { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import classes from './EditCodeList.module.css';
import type { ApiError } from 'app-shared/types/api/ApiError';

export function EditCodeList<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
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
  };

  const handleUpload = (file: File) => {
    uploadOptionList(file, {
      onSuccess: () => {
        handleOptionsIdChange(removeExtension(file.name));
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
      },
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode) {
          toast.error(`${t('ux_editor.modal_properties_code_list_upload_generic_error')}`);
        }
      },
    });
  };

  const onSubmit = (file: File) => {
    const fileNameError = findFileNameError(optionListIds, file.name);
    if (fileNameError) {
      handleInvalidFileName(fileNameError);
    } else {
      handleUpload(file);
    }
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
    <>
      <CodeListSelector component={component} handleOptionsIdChange={handleOptionsIdChange} />
      <StudioFileUploader
        className={classes.studioFileUploader}
        accept='.json'
        variant={'tertiary'}
        uploaderButtonText={t('ux_editor.modal_properties_code_list_upload')}
        onSubmit={onSubmit}
      />
      <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more_static'}>
        <a
          className={classes.linkStaticCodeLists}
          href={altinnDocsUrl({
            relativeUrl: 'altinn-studio/reference/data/options/static-codelists/',
          })}
          target='_newTab'
          rel='noopener noreferrer'
        />
      </Trans>
    </>
  );
}

type CodeListSelectorProps<T extends SelectionComponentType> = {
  handleOptionsIdChange: (optionsId: string) => void;
} & Pick<IGenericEditComponent<T>, 'component'>;

function CodeListSelector<T extends SelectionComponentType>({
  component,
  handleOptionsIdChange,
}: CodeListSelectorProps<T>): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status, error } = useOptionListIdsQuery(org, app);

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
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      );
    case 'success':
      return (
        <CodeListSelectorWithData
          optionListIds={optionListIds}
          component={component}
          handleOptionsIdChange={handleOptionsIdChange}
        />
      );
  }
}

type CodeListSelectorWithDataProps<T extends SelectionComponentType> = {
  optionListIds: string[];
  handleOptionsIdChange: (optionsId: string) => void;
} & Pick<IGenericEditComponent<T>, 'component'>;

function CodeListSelectorWithData<T extends SelectionComponentType>({
  optionListIds,
  component,
  handleOptionsIdChange,
}: CodeListSelectorWithDataProps<T>): React.ReactNode {
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
