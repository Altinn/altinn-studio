import React from 'react';
import {
  convertMetadataListToOptions,
  findMetadataOptionByRelativeUrl,
} from 'app-development/utils/metadataUtils';
import type { MetadataOption } from 'app-development/types/MetadataOption';
import classes from './SubformDataModelSelect.module.css';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components';

export interface ISubformDataModelSelectProps {
  dataModels: DataModelMetadataJson[];
  disabled: boolean;
  selectedOption: MetadataOption | null;
  setSelectedOption: (option: MetadataOption) => void;
}

export const SubformDataModelSelect = ({
  dataModels,
  disabled,
  selectedOption,
  setSelectedOption,
}: ISubformDataModelSelectProps) => {
  const { t } = useTranslation();
  const options = convertMetadataListToOptions(dataModels);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedOption(findMetadataOptionByRelativeUrl(options, e.target.value));
  }

  return (
    <StudioNativeSelect
      label={t('ux_editor.component_properties.subform.data_model_binding_label')}
      className={classes.select}
      disabled={disabled}
      onChange={handleChange}
      value={selectedOption?.value.repositoryRelativeUrl || ''}
      size='small'
    >
      {options.map((option) => (
        <option value={option.value.repositoryRelativeUrl} key={option.value.repositoryRelativeUrl}>
          {option.label}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
