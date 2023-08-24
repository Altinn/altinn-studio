import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Select, TextField, ToggleButtonGroup } from '@digdir/design-system-react';
import { DataSource, ExpressionElement } from '../../../types/Expressions';
import { IFormLayouts } from '../../../types/global';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { FormComponent } from '../../../types/FormComponent';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { selectedLayoutSetSelector } from '../../../selectors/formLayoutSelectors';

interface DataSourceValueProps {
  expressionElement: ExpressionElement;
  currentDataSource: DataSource;
  specifyDataSourceValue: (dataSourceValue: string, isComparable: boolean) => void;
  isComparableValue: boolean;
}

export const DataSourceValue = ({
                                  expressionElement,
                                  currentDataSource,
                                  specifyDataSourceValue,
                                  isComparableValue,
                                }: DataSourceValueProps) => {
  const { org, app } = useParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const datamodelQuery = useDatamodelMetadataQuery(org, app);
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const dataModelElementsData = datamodelQuery?.data ?? [];
  const formLayoutsData = formLayoutsQuery?.data ?? [];

  // TODO: Make sure all data model fields are included - what if there are multiple data models? . Issue #10855
  const getDataModelElementNames = (dataModelElements: DatamodelFieldElement[]) => {
    return dataModelElements
      .filter(element => element.dataBindingName)
      .map((element) => ({
        value: element.dataBindingName,
        label: element.dataBindingName,
      }))
  };

  const getComponentIds = (formLayouts: IFormLayouts) => {
    // TODO: Make sure all components from the layout set are included, also those inside groups. Issue #10855
    const components = Object.values(formLayouts).flatMap(layout => Object.values(layout.components));
    // TODO: Make sure there are not duplicate component ids. Related issue: 10857
    return Object.values(components).map((comp: FormComponent) => ({
      value: comp.id,
      label: comp.id,
    }));
  };

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
        options={[{ label: 'Velg...', value: 'default' }].concat(getCorrespondingDataSourceValues(currentDataSource))}
        value={isComparableValue ? expressionElement.comparableValue : expressionElement.value || 'default'}
      />);
    case DataSource.String:
    case DataSource.Number:
      return (<TextField
        formatting={currentDataSource === DataSource.Number ? { number: {} } : {}}
        onChange={(e) => specifyDataSourceValue(e.target.value, isComparableValue)}
        value={isComparableValue ? expressionElement.comparableValue : expressionElement.value || ''}
      />);
    case DataSource.Boolean:
      return (<ToggleButtonGroup
        items={[
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' }
        ]}
        onChange={(value) => specifyDataSourceValue(value, isComparableValue)}
        selectedValue={isComparableValue ? expressionElement.comparableValue : expressionElement.value || 'true'}
      />);
    case DataSource.Null:
      return (<div></div>);
    default:
      return null;
  }
};
