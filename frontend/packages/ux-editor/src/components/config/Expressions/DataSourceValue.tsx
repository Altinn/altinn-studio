import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Select, TextField, ToggleButtonGroup } from '@digdir/design-system-react';
import { DataSource, SubExpression } from '../../../types/Expressions';
import { IFormLayouts } from '../../../types/global';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { selectedLayoutSetSelector } from '../../../selectors/formLayoutSelectors';
import { getComponentIds, getDataModelElementNames } from '../../../utils/expressionsUtils';
import { useText } from '../../../hooks';

interface DataSourceValueProps {
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
  const { org, app } = useParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const datamodelQuery = useDatamodelMetadataQuery(org, app);
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const t = useText();

  const dataModelElementsData = datamodelQuery?.data ?? [];
  const formLayoutsData = formLayoutsQuery?.data ?? [];

  const getCorrespondingDataSourceValues = (dataSource: DataSource) => {
    switch (dataSource) {
      case DataSource.Component:
        return getComponentIds(formLayoutsData as IFormLayouts);
      case DataSource.DataModel:
        return getDataModelElementNames(dataModelElementsData as DatamodelFieldElement[]);
      case DataSource.InstanceContext:
        return ['instanceOwnerPartyId', 'instanceId', 'appId'].map((dsv: string) => ({ label: dsv, value: dsv }));
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
      return (<Select
        onChange={(dataSourceValue: string) => specifyDataSourceValue(dataSourceValue, isComparableValue)}
        options={[{ label: t('right_menu.expressions_data_source_select'), value: 'default' }].concat(getCorrespondingDataSourceValues(currentDataSource))}
        value={isComparableValue ? subExpression.comparableValue : subExpression.value || 'default'}
      />);
    case DataSource.String:
    case DataSource.Number:
      return (<TextField
        formatting={currentDataSource === DataSource.Number ? { number: {} } : {}}
        onChange={(e) => specifyDataSourceValue(e.target.value, isComparableValue)}
        value={isComparableValue ? subExpression.comparableValue : subExpression.value || ''}
      />);
    case DataSource.Boolean:
      return (<ToggleButtonGroup
        items={[
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' }
        ]}
        onChange={(value) => specifyDataSourceValue(value, isComparableValue)}
        selectedValue={isComparableValue ? subExpression.comparableValue : subExpression.value || 'true'}
      />);
    case DataSource.Null:
      return (<div></div>);
    default:
      return null;
  }
};
