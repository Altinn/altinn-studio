import type { ReactElement } from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';
import type { EnvironmentEntry } from '../types';
import type { EnvironmentValueControlProps } from '../EnvironmentConfigField';
import { EnvironmentConfigField } from '../EnvironmentConfigField';
import { orderSelectedDataTypes } from './dataTypeOrdering';

/** A stable identity, so the field does not see a new empty value on every render. */
const emptyDataTypeList: string[] = [];

/**
 * `AltinnEFormidlingConfiguration.GetDataTypesForEnvironment` concatenates every entry of an
 * environment, so the effective value is the union of them, in file order.
 */
const combineDataTypeLists = (values: string[][]): string[] =>
  ArrayUtils.removeDuplicates(values.flat());

export type EnvDataTypeListConfigFieldProps = {
  label: string;
  description?: string;
  required?: boolean;
  /** The data type ids the app defines, offered as options. */
  dataTypeIds: string[];
  entries: EnvironmentEntry<string[]>[];
  onChange: (entries: EnvironmentEntry<string[]>[]) => void;
};

/** A list of data type ids that can be overridden per environment. */
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
  // Ids the app no longer defines stay selectable, so opening the panel cannot drop them.
  const options = ArrayUtils.removeDuplicates([...dataTypeIds, ...value]);

  const handleSelectedChange = (items: StudioSuggestionItem[]): void => {
    const selectedDataTypes = items.map((item) => item.value);
    onChange(orderSelectedDataTypes(value, selectedDataTypes));
  };

  return (
    <StudioSuggestion
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
