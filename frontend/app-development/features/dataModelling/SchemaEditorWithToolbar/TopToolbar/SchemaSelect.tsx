import React from 'react';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import {
  convertMetadataListToOptions,
  findMetadataOptionByRelativeUrl,
  groupMetadataOptions
} from '../../../../utils/metadataUtils';
import { MetadataOption } from '../../../../types/MetadataOption';
import { NativeSelect } from '@digdir/design-system-react';
import classes from './SchemaSelect.module.css';

export interface ISchemaSelectProps {
  disabled: boolean;
  selectedOption: MetadataOption | null;
  setSelectedOption: (option: MetadataOption) => void;
}

export const SchemaSelect = ({ disabled, selectedOption, setSelectedOption }: ISchemaSelectProps) => {
  const { data: metadataItems } = useDatamodelsMetadataQuery();

  const options = metadataItems ? convertMetadataListToOptions(metadataItems) : [];
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
