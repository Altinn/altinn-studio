import React, { type ChangeEvent } from 'react';
import type { SubExpression } from '../../../../../../types/Expressions';
import { DataSource } from '../../../../../../types/Expressions';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import { useDataModelMetadataQuery } from '../../../../../../hooks/queries/useDataModelMetadataQuery';
import { useFormLayoutsQuery } from '../../../../../../hooks/queries/useFormLayoutsQuery';
import {
  getComponentIds,
  getDataModelElementNames,
} from '../../../../../../utils/expressionsUtils';
import { useText } from '../../../../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../../../hooks/useAppContext';
import { StudioNativeSelect } from '@studio/components-legacy';
import { StudioTextfield } from '@studio/components';
import { ToggleGroup } from '@digdir/designsystemet-react';

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
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  // TODO: Show spinner when isLoading
  const dataModelQuery = useDataModelMetadataQuery(org, app, selectedLayoutSet, undefined);
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const t = useText();

  const dataModelElementsData = dataModelQuery?.data ?? [];
  const currentValue = isComparableValue ? subExpression.comparableValue : subExpression.value;
  const selectedValueForDisplayIfBoolean = currentValue ? 'true' : 'false';

  const getCorrespondingDataSourceValues = (
    dataSource: DataSource,
  ): { value: string; label: string }[] => {
    switch (dataSource) {
      case DataSource.Component:
        return getComponentIds(formLayoutsData);
      case DataSource.DataModel:
        return getDataModelElementNames(dataModelElementsData as DataModelFieldElement[]);
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
        <StudioNativeSelect
          id={`data-source-value-select${currentDataSource}`}
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            specifyDataSourceValue(event.target.value, isComparableValue)
          }
          value={(currentValue as string) || 'default'}
        >
          <option key={''} value={'default'}>
            {t('right_menu.expressions_data_source_select')}
          </option>
          {getCorrespondingDataSourceValues(currentDataSource).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StudioNativeSelect>
      );
    case DataSource.String:
      return (
        <StudioTextfield
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            specifyDataSourceValue(e.target.value, isComparableValue)
          }
          value={currentValue as string}
        />
      );
    case DataSource.Number:
      return (
        <StudioTextfield
          label={
            isComparableValue
              ? t('right_menu.expressions_data_source_comparable_value')
              : t('right_menu.expressions_data_source_value')
          }
          type='number'
          inputMode='numeric'
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            specifyDataSourceValue(e.target.value, isComparableValue)
          }
          value={currentValue as string}
        />
      );
    case DataSource.Boolean:
      return (
        <ToggleGroup
          onChange={(value) => specifyDataSourceValue(value, isComparableValue)}
          value={selectedValueForDisplayIfBoolean}
          size='sm'
        >
          <ToggleGroup.Item value='true'>{t('general.true')}</ToggleGroup.Item>
          <ToggleGroup.Item value='false'>{t('general.false')}</ToggleGroup.Item>
        </ToggleGroup>
      );
    default:
      return null;
  }
};
