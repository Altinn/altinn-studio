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
 * `dataTypes` is the one environment-scoped field the runtime does not resolve by last-one-wins:
 * `AltinnEFormidlingConfiguration.GetDataTypesForEnvironment` calls `existingList.AddRange`, so
 * every entry resolving to an environment contributes and the effective value is all of them
 * together. The panel has to show that union, or it would name a value the app does not use.
 *
 * `AddRange` keeps an id that two entries both list, so the app ships that attachment twice. The
 * union here keeps it once, and consolidating the entries then writes it once - so this is the one
 * place the panel changes what the app does rather than only how it is written. Nobody configures
 * the same attachment twice on purpose, so the union is the reading worth showing, but it is a
 * change and the alert says so.
 *
 * The union follows the order the entries appear in the file, which is the order `AddRange` builds.
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

/** An `<altinn:dataType/>` with no id in it. */
const isUnnamedDataType = (dataType: string): boolean => !dataType.trim();

/** A list of data type ids that can be overridden per environment. */
export const EnvDataTypeListConfigField = ({
  dataTypeIds,
  entries,
  ...props
}: EnvDataTypeListConfigFieldProps): ReactElement => {
  const { t } = useTranslation();
  // An `<altinn:dataType/>` with nothing in it names no data type, so there is no chip the
  // multi-select could show for it and no id the user could recognize. It is left out of the rows
  // and goes the next time this field is written - which is a deletion, so it is announced rather
  // than done quietly.
  const unnamedDataTypeCount = entries
    .flatMap(({ value }) => value)
    .filter(isUnnamedDataType).length;
  const namedEntries =
    unnamedDataTypeCount === 0
      ? entries
      : entries.map((entry) => ({
          ...entry,
          value: entry.value.filter((dataType) => !isUnnamedDataType(dataType)),
        }));

  return (
    <EnvironmentConfigField<string[]>
      {...props}
      combineDuplicateValues={combineDataTypeLists}
      emptyValue={emptyDataTypeList}
      entries={namedEntries}
      isEmptyValue={(value) => value.length === 0}
      formatValue={(value) => value.join(', ')}
      warning={
        unnamedDataTypeCount > 0
          ? t('process_editor.configuration_panel.environment_config.unnamed_data_types_alert', {
              count: unnamedDataTypeCount,
            })
          : undefined
      }
      renderValueControl={(controlProps) => (
        <DataTypeListValueControl {...controlProps} dataTypeIds={dataTypeIds} />
      )}
    />
  );
};

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
  // Keep ids that the app no longer defines selectable, so opening the panel cannot silently drop
  // them from the BPMN.
  const options = [...new Set([...dataTypeIds, ...value])];

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
