import React from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import { useAddOptionListMutation } from 'app-shared/hooks/mutations';
import { useTranslation, Trans } from 'react-i18next';
import { StudioFileUploader, StudioNativeSelect, StudioSpinner } from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { FileNameUtils } from '@studio/pure-functions';
import { findFileNameError } from './utils/findFileNameError';
import type { FileNameError } from './utils/findFileNameError';
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import classes from './EditOptionList.module.css';
import { OptionListEditor } from './OptionListEditor';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export function EditOptionList<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isUnknownError(error),
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
        if (isUnknownError(error)) {
          toast.error(t('ux_editor.modal_properties_code_list_upload_generic_error'));
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

  const componentHasConnectedOptionListToEdit = !!component.optionsId;

  return (
    <>
      <OptionListSelector component={component} handleOptionsIdChange={handleOptionsIdChange} />
      {shouldDisplayFeature('optionListEditor') && componentHasConnectedOptionListToEdit && (
        <OptionListEditor optionsId={component.optionsId} />
      )}
      <StudioFileUploader
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

const isUnknownError = (error: AxiosError<ApiError>) => !error.response?.data?.errorCode;

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
      return <ErrorMessage>{t('ux_editor.modal_properties_error_message')}</ErrorMessage>;
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
