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
import {
  validateFileName,
  isFileNameDuplicate,
  isFilenameValid,
} from './Utils/validateFileNameUtils';
import { toast } from 'react-toastify';
import classes from './EditCodeList.module.css';

export function EditCodeList<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app);

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  const handleInvalidFileName = (file?: FormData, fileName?: string) => {
    const fileNameWithoutExtension = removeExtension(fileName);
    if (isFileNameDuplicate(optionListIds, fileNameWithoutExtension)) {
      toast.error(t('ux_editor.modal_properties_code_list_upload_duplicate_error'));
    }
  };

  const handleUpload = (file: FormData) => {
    uploadOptionList(file, {
      onSuccess: () => {
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
        const entries = file.entries();
        entries.forEach((entry) => {
          if (entry[1] instanceof File) {
            handleOptionsIdChange(removeExtension(entry[1].name));
          }
        });
      },
    });
  };

  const onValidateFileName = (fileName: string) => {
    if (!isFilenameValid(fileName)) {
      alert(t('ux_editor.model_properties_code_list_filename_error'));
    }

    return validateFileName(optionListIds, fileName);
  };

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
      <StudioFileUploader
        className={classes.studioFileUploader}
        onUploadFile={handleUpload}
        accept='.json'
        variant={'tertiary'}
        uploaderButtonText={t('ux_editor.modal_properties_code_list_upload')}
        ref={React.useRef<HTMLInputElement>(null)}
        customFileValidation={{
          validateFileName: onValidateFileName,
          onInvalidFileName: handleInvalidFileName,
        }}
      />

      <p>
        <Trans
          className={classes.linkStaticCodeLists}
          i18nKey={'ux_editor.modal_properties_code_list_read_more_static'}
        >
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
