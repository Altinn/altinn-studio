import {
  convertMetadataListToOptions,
  findMetadataOptionByRelativeUrl,
  groupMetadataOptions,
} from '../../../../../utils/metadataUtils';
import type { MetadataOption } from '../../../../../types/MetadataOption';
import classes from './SchemaSelect.module.css';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import { useTranslation } from 'react-i18next';
import { StudioSelect } from '@studio/components';

export interface ISchemaSelectProps {
  dataModels: DataModelMetadata[];
  disabled: boolean;
  selectedOption: MetadataOption | null;
  setSelectedOption: (option: MetadataOption) => void;
}

export const SchemaSelect = ({
  dataModels,
  disabled,
  selectedOption,
  setSelectedOption,
}: ISchemaSelectProps) => {
  const { t } = useTranslation();
  const options = convertMetadataListToOptions(dataModels);
  const optionGroups = groupMetadataOptions(options);
  const handleChange = (repositoryUrl: string) =>
    setSelectedOption(findMetadataOptionByRelativeUrl(options, repositoryUrl));

  return (
    <StudioSelect
      aria-label={t('schema_editor.choose_model')}
      className={classes.select}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      value={selectedOption?.value.repositoryRelativeUrl}
      label=''
    >
      {optionGroups.map((group) => (
        <StudioSelect.OptGroup label={group.label} key={group.label}>
          {group.options.map((option) => (
            <StudioSelect.Option
              value={option.value.repositoryRelativeUrl}
              key={option.value.repositoryRelativeUrl}
            >
              {option.label}
            </StudioSelect.Option>
          ))}
        </StudioSelect.OptGroup>
      ))}
    </StudioSelect>
  );
};
