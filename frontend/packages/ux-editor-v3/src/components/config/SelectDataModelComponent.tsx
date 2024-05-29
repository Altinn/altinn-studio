import React, { useEffect } from 'react';
import { LegacySelect } from '@digdir/design-system-react';
import { useDataModelMetadataQuery } from '../../hooks/queries/useDataModelMetadataQuery';
import { FormField } from '../FormField';
import type { Option } from '@altinn/text-editor/types';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../hooks/useAppContext';

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
        <LegacySelect
          {...fieldProps}
          onChange={(e: any) => fieldProps.onChange(e)}
          options={dataModelElementNames}
        />
      )}
    />
  );
};
