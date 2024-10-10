import React from 'react';
import { Alert, ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useOptionListIdsQuery } from '../../../../../hooks/queries/useOptionListIdsQuery';
import { useAddOptionMutation } from '../../../../../hooks/mutations/useAddOptionMutation';
import { useTranslation, Trans } from 'react-i18next';
import { StudioFileUploader, StudioNativeSelect, StudioSpinner } from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { FormField } from '../../../../FormField';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ManualCodelistUploadSteps } from './ManualCodelistUploadSteps';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import { fileSelectorInputId } from '@studio/testing/testids';
import { removeExtension } from 'app-shared/utils/filenameUtils';
import { useValidateFileName } from './useValidateFileName';
import type { ApiError } from 'app-shared/types/api/ApiError';
import type { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import classes from './EditCodeList.module.css';

export function EditCodeList<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOption } = useAddOptionMutation(org, app);

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  const { validateFileName, getDuplicatedOptionIds } = useValidateFileName(optionListIds);

  const handleInvalidFileName = (file?: FormData, fileName?: string) => {
    const fileNameWithoutExtension = removeExtension(fileName);
    if (getDuplicatedOptionIds(optionListIds, fileNameWithoutExtension)) {
      toast.error(t('ux_editor.modal_properties_code_list_upload_duplicate_error'));
    }
  };

  const handleUpload = (file: FormData) => {
    uploadOption(file, {
      onError: (error: AxiosError<ApiError>) => {
        if (!error.response?.data?.errorCode)
          toast.error(t('ux_editor.modal_properties_code_list_upload_error'));
      },
      onSuccess: () => {
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
      },
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div>
      {isPending ? (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      ) : isError ? (
        <ErrorMessage>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      ) : optionListIds?.length === 0 ? (
        <>
          <Alert severity='info' size='small'>
            {t('ux_editor.modal_properties_no_options_found_message')}
          </Alert>
          <ManualCodelistUploadSteps />
        </>
      ) : (
        <FormField
          key={component.id}
          id={component.id}
          label={t('ux_editor.modal_properties_code_list_id')}
          onChange={handleOptionsIdChange}
          value={component.optionsId}
          propertyPath={`${component.propertyPath}/properties/optionsId`}
          renderField={({ fieldProps }) => (
            <StudioNativeSelect
              onChange={(e) => fieldProps.onChange(e.target.value)}
              value={fieldProps.value}
            >
              <option hidden value=''>
                {t('ux_editor.modal_properties_code_list_helper')}
              </option>
              {optionListIds.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </StudioNativeSelect>
          )}
        />
      )}
      <div className={classes.studioFileUploader}>
        <StudioFileUploader
          onUploadFile={handleUpload}
          accept='.json'
          variant={'tertiary'}
          uploaderButtonText={t('ux_editor.modal_properties_code_list_upload')}
          ref={fileInputRef}
          customFileValidation={{
            validateFileName: validateFileName,
            onInvalidFileName: handleInvalidFileName,
          }}
          dataTestId={fileSelectorInputId}
        />
      </div>

      <p className={classes.linkStaticCodeLists}>
        <Trans i18nKey={'ux_editor.modal_properties_code_list_read_more_static'}>
          <a
            href={altinnDocsUrl('altinn-studio/reference/data/options/static-codelists/')}
            target='_newTab'
            rel='noopener noreferrer'
          />
        </Trans>
      </p>
    </div>
  );
}
