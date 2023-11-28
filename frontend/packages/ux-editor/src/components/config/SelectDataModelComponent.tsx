import React, { useEffect } from 'react';
import { Select } from '@digdir/design-system-react';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import { FormField } from '../FormField';
import { Option } from 'packages/text-editor/src/types';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface ISelectDataModelProps {
  inputId?: string;
  selectedElement: string;
  label: string;
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
  label,
  onDataModelChange,
  noOptionsMessage,
  selectGroup,
  componentType,
  helpText,
  propertyPath,
}: ISelectDataModelProps) => {
  const { org, app } = useStudioUrlParams();
  const { data } = useDatamodelMetadataQuery(org, app);
  const [dataModelElementNames, setDataModelElementNames] = React.useState<Option[]>([]);

  useEffect(() => {
    if (!data) return;
    const elementNames = data
      .filter(
        (element) =>
          element.dataBindingName &&
          ((!selectGroup && element.maxOccurs <= 1) || (selectGroup && element.maxOccurs > 1)),
      )
      .map((element) => ({
        value: element.dataBindingName,
        label: element.dataBindingName,
      }));
    setDataModelElementNames(elementNames);
  }, [data, selectGroup]);

  const onChangeSelectedBinding = (e: any) => {
    onDataModelChange(e);
  };

  return (
    <FormField
      id={inputId}
      onChange={onChangeSelectedBinding}
      value={selectedElement}
      propertyPath={propertyPath}
      componentType={componentType}
      helpText={helpText}
      label={label}
      renderField={({ fieldProps }) => (
        <Select
          {...fieldProps}
          onChange={(e: any) => fieldProps.onChange(e)}
          options={dataModelElementNames}
        />
      )}
    />
  );
};
