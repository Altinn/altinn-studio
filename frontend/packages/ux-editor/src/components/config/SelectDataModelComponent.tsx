import React, { useEffect } from 'react';
import { LegacySelect } from '@digdir/design-system-react';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import { FormField } from '../FormField';
import type { Option } from 'packages/text-editor/src/types';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useAppContext } from '../../hooks/useAppContext';

export interface ISelectDataModelProps {
  inputId?: string;
  selectedElement: string;
  label: string;
  onDataModelChange: (dataModelField: string) => void;
  noOptionsMessage?: string;
  hideRestrictions?: boolean;
  dataModelFieldsFilter?: (dataModelField: DatamodelFieldElement) => boolean;
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
  dataModelFieldsFilter,
  componentType,
  helpText,
  propertyPath,
}: ISelectDataModelProps) => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { data } = useDatamodelMetadataQuery(org, app, selectedLayoutSet);
  const [dataModelElementNames, setDataModelElementNames] = React.useState<Option[]>([]);

  useEffect(() => {
    if (!data) return;
    const elementNames = data.filter(dataModelFieldsFilter).map((element) => ({
      value: element.dataBindingName,
      label: element.dataBindingName,
    }));
    setDataModelElementNames(elementNames);
  }, [data, dataModelFieldsFilter]);

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
