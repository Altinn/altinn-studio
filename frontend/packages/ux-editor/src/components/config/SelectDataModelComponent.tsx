import React from 'react';
// import Select from 'react-select';
import { Select } from '@digdir/design-system-react';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import { useParams } from 'react-router-dom';
import { FormField } from '../FormField';

export interface ISelectDataModelProps {
  inputId?: string;
  selectedElement: string;
  onDataModelChange: (dataModelField: string) => void;
  noOptionsMessage?: string;
  hideRestrictions?: boolean;
  selectGroup?: boolean;
  componentType?: string;
  propertyPath?: string;
  helpText?: string;
}

export const SelectDataModelComponent = ({
  inputId,
  selectedElement,
  onDataModelChange,
  noOptionsMessage,
  selectGroup,
  componentType,
  helpText,
  propertyPath,
}: ISelectDataModelProps) => {
  const { org, app } = useParams();
  const datamodelQuery = useDatamodelMetadataQuery(org, app);
  const dataModelElements = datamodelQuery?.data ?? [];

  const onChangeSelectedBinding = (e: any) => {
    onDataModelChange(e);
  };

  const StyledSelect = (props: any) => {
    console.log('props: ', props);
    return (
      <span style={{ width: '90%' }}>
        <Select {...props} />
      </span>
    );
  };

  const dataModelElementNames = dataModelElements
    .filter(
      (element) =>
        element.dataBindingName &&
        ((!selectGroup && element.maxOccurs <= 1) || (selectGroup && element.maxOccurs > 1))
    )
    .map((element) => ({
      value: element.dataBindingName,
      label: element.dataBindingName,
    }));

  return (
    <FormField
      id={inputId}
      onChange={onChangeSelectedBinding}
      value={selectedElement}
      propertyPath={propertyPath}
      componentType={componentType}
      helpText={helpText}
    >
      {({ onChange }) => (
        <StyledSelect
          value={selectedElement}
          onChange={(e: any) => onChange(e)}
          options={dataModelElementNames}
        />
      )}
    </FormField>
  );
};
