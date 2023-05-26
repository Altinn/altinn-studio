import React from 'react';
import Select from 'react-select';
import { useDatamodelQuery } from '../../hooks/queries/useDatamodelQuery';
import { useParams } from 'react-router-dom';

export interface ISelectDataModelProps {
  inputId?: string;
  selectedElement: string;
  onDataModelChange: (dataModelField: string) => void;
  noOptionsMessage?: string;
  hideRestrictions?: boolean;
  selectGroup?: boolean;
}

export interface ISelectDataModelState {
  selectedElement: string;
}

const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
};

export const SelectDataModelComponent = ({
  inputId,
  selectedElement,
  onDataModelChange,
  noOptionsMessage,
  selectGroup,
}: ISelectDataModelProps) => {
  const { org, app } = useParams();
  const datamodelQuery = useDatamodelQuery(org, app);
  const dataModelElements = datamodelQuery?.data ?? [];

  const onChangeSelectedBinding = (e: any) => {
    onDataModelChange(e.value);
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
      <Select
        inputId={inputId}
        styles={selectStyles}
        options={dataModelElementNames}
        value={{ value: selectedElement, label: selectedElement }}
        onChange={onChangeSelectedBinding}
        noOptionsMessage={(): string => noOptionsMessage}
      />
    );
}
