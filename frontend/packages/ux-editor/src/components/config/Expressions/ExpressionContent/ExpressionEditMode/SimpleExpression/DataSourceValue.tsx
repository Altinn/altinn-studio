import React from 'react';
import {
  Select,
  SingleSelectOption,
  LegacyToggleButtonGroup,
  LegacyTextField,
} from '@digdir/design-system-react';
import { DataSource, SubExpression } from '../../../../../../types/Expressions';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useDatamodelMetadataQuery } from '../../../../../../hooks/queries/useDatamodelMetadataQuery';
import { useFormLayoutsQuery } from '../../../../../../hooks/queries/useFormLayoutsQuery';
import {
  getComponentIds,
  getDataModelElementNames,
} from '../../../../../../utils/expressionsUtils';
import { useText } from '../../../../../../hooks';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../../../hooks/useAppContext';

export interface DataSourceValueProps {
  subExpression: SubExpression;
  currentDataSource: DataSource;
  specifyDataSourceValue: (dataSourceValue: string, isComparable: boolean) => void;
  isComparableValue: boolean;
}

export const DataSourceValue = ({
  subExpression,
  currentDataSource,
  specifyDataSourceValue,
  isComparableValue,
}: DataSourceValueProps) => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  // TODO: Show spinner when isLoading
  const datamodelQuery = useDatamodelMetadataQuery(org, app);
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const t = useText();

  const dataModelElementsData = datamodelQuery?.data ?? [];
  const currentValue = isComparableValue ? subExpression.comparableValue : subExpression.value;
  const selectedValueForDisplayIfBoolean = currentValue ? 'true' : 'false';

  const getCorrespondingDataSourceValues = (dataSource: DataSource): SingleSelectOption[] => {
    switch (dataSource) {
      case DataSource.Component:
        return getComponentIds(formLayoutsData);
      case DataSource.DataModel:
        return getDataModelElementNames(dataModelElementsData as DatamodelFieldElement[]);
      case DataSource.InstanceContext:
        return ['instanceOwnerPartyId', 'instanceId', 'appId'].map((dsv: string) => ({
          label: dsv,
          value: dsv,
        }));
      case DataSource.ApplicationSettings:
        // TODO: Should convert appmetadatasagas to react-query before implementing this. Issue #10856
        return [{ label: 'Not implemented yet', value: 'NotImplementedYet' }];
      default:
        return [];
    }
  };

  switch (currentDataSource) {
    case DataSource.Component:
    case DataSource.DataModel:
    case DataSource.InstanceContext:
    case DataSource.ApplicationSettings:
      return (
        <Select
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          hideLabel={true}
          onChange={(dataSourceValue: string) =>
            specifyDataSourceValue(dataSourceValue, isComparableValue)
          }
          options={[
            { label: t('right_menu.expressions_data_source_select'), value: 'default' },
          ].concat(getCorrespondingDataSourceValues(currentDataSource))}
          value={(currentValue as string) || 'default'}
        />
      );
    case DataSource.String:
      return (
        <LegacyTextField
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          onChange={(e) => specifyDataSourceValue(e.target.value, isComparableValue)}
          value={currentValue as string}
        />
      );
    case DataSource.Number:
      return (
        <LegacyTextField
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          formatting={{ number: {} }}
          inputMode='numeric'
          onChange={(e) => specifyDataSourceValue(e.target.value, isComparableValue)}
          value={currentValue as string}
        />
      );
    case DataSource.Boolean:
      return (
        <LegacyToggleButtonGroup
          items={[
            { label: t('general.true'), value: 'true' },
            { label: t('general.false'), value: 'false' },
          ]}
          onChange={(value) => specifyDataSourceValue(value, isComparableValue)}
          selectedValue={selectedValueForDisplayIfBoolean}
        />
      );
    default:
      return null;
  }
};
