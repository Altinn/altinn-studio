import type { ReactElement } from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';
import { orderSelectedDataTypes } from './dataTypeOrdering';

/** Reuse the empty array to keep the field value stable across renders. */
const emptyDataTypeList: string[] = [];

/**
 * Match AltinnEFormidlingConfiguration.GetDataTypesForEnvironment by combining entries for the same
 * environment in file order.
 */
const combineDataTypeLists = (values: string[][]): string[] =>
  ArrayUtils.removeDuplicates(values.flat());

export type EnvDataTypeListConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  dataTypeIds: string[];
  entries: EnvironmentEntry<string[]>[];
  onChange: (entries: EnvironmentEntry<string[]>[]) => void;
};

export const EnvDataTypeListConfigField = ({
  dataTypeIds,
  ...props
}: EnvDataTypeListConfigFieldProps): ReactElement => (
  <EnvironmentConfigField<string[]>
    {...props}
    combineDuplicateValues={combineDataTypeLists}
    emptyValue={emptyDataTypeList}
    isEmptyValue={(value) => value.length === 0}
    formatValue={(value) => value.join(', ')}
    renderValueControl={(controlProps) => (
      <DataTypeListValueControl {...controlProps} dataTypeIds={dataTypeIds} />
    )}
  />
);

type DataTypeListValueControlProps = EnvironmentValueControlProps<string[]> & {
  dataTypeIds: string[];
};

const DataTypeListValueControl = ({
  label,
  value,
  onChange,
  dataTypeIds,
}: DataTypeListValueControlProps): ReactElement => {
  const { t } = useTranslation();
  // Keep missing data types selectable so opening the panel does not remove them.
  const options = ArrayUtils.removeDuplicates([...dataTypeIds, ...value]);

  const handleSelectedChange = (items: StudioSuggestionItem[]): void => {
    const selectedDataTypes = items.map((item) => item.value);
    onChange(orderSelectedDataTypes(value, selectedDataTypes));
  };

  return (
    <StudioSuggestion
      clearButtonLabel={t('general.clear_selection')}
      emptyText={t('general.no_options')}
      label={label}
      multiple
      onSelectedChange={handleSelectedChange}
      selected={value}
    >
      {options.map((option) => (
        <StudioSuggestion.Option key={option} label={option} value={option}>
          {option}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
