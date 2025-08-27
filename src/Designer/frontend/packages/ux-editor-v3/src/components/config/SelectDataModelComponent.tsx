import React, { useEffect } from 'react';
import { useDataModelMetadataQuery } from '../../hooks/queries/useDataModelMetadataQuery';
import { FormField } from '../FormField';
import type { Option } from '@altinn/text-editor/types';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks/useAppContext';
import { StudioNativeSelect } from '@studio/components-legacy';

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
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const { data } = useDataModelMetadataQuery(org, app, selectedLayoutSet, undefined);
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
        <StudioNativeSelect {...fieldProps} onChange={(e: any) => fieldProps.onChange(e)}>
          <option value=''></option>
          {dataModelElementNames.map((element) => (
            <option key={element.value} value={element.value}>
              {element.label}
            </option>
          ))}
        </StudioNativeSelect>
      )}
    />
  );
};
