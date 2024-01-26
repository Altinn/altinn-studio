import React from 'react';
import {
  convertMetadataListToOptions,
  findMetadataOptionByRelativeUrl,
  groupMetadataOptions,
} from '../../../../utils/metadataUtils';
import type { MetadataOption } from '../../../../types/MetadataOption';
import { NativeSelect } from '@digdir/design-system-react';
import classes from './SchemaSelect.module.css';
import type { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { useTranslation } from 'react-i18next';

export interface ISchemaSelectProps {
  datamodels: DatamodelMetadata[];
  disabled: boolean;
  selectedOption: MetadataOption | null;
  setSelectedOption: (option: MetadataOption) => void;
}

export const SchemaSelect = ({
  datamodels,
  disabled,
  selectedOption,
  setSelectedOption,
}: ISchemaSelectProps) => {
  const { t } = useTranslation();
  const options = convertMetadataListToOptions(datamodels);
  const optionGroups = groupMetadataOptions(options);
  const handleChange = (repositoyUrl: string) =>
    setSelectedOption(findMetadataOptionByRelativeUrl(options, repositoyUrl));

  return (
    <NativeSelect
      aria-label={t('schema_editor.choose_model')}
      className={classes.select}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      value={selectedOption?.value.repositoryRelativeUrl}
    >
      {optionGroups.map((group) => (
        <optgroup label={group.label} key={group.label}>
          {group.options.map((option) => (
            <option
              value={option.value.repositoryRelativeUrl}
              key={option.value.repositoryRelativeUrl}
            >
              {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
};
