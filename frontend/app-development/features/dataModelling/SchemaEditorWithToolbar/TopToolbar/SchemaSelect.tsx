import React from 'react';
import {
  convertMetadataListToOptions,
  findMetadataOptionByRelativeUrl,
  groupMetadataOptions,
} from '../../../../utils/metadataUtils';
import { MetadataOption } from '../../../../types/MetadataOption';
import { NativeSelect } from '@digdir/design-system-react';
import classes from './SchemaSelect.module.css';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

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
  const options = convertMetadataListToOptions(datamodels);
  const optionGroups = groupMetadataOptions(options);
  const handleChange = (repositoyUrl: string) =>
    setSelectedOption(findMetadataOptionByRelativeUrl(options, repositoyUrl));

  return (
    <NativeSelect
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
