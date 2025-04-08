import React from 'react';
import { useTranslation } from 'react-i18next';

export type NewSubformProps = {
  subformName: string;
  dataModelName: string;
};

type IsSaveButtonDisabledProps = {
  newSubform: NewSubformProps;
  subformError: string;
  dataModelError: string;
};

export const isSaveButtonDisabled = ({
  newSubform,
  subformError,
  dataModelError,
}: IsSaveButtonDisabledProps): boolean => {
  const { subformName, dataModelName } = newSubform;
  const inputsAreEmpty = subformName === '' || dataModelName === '';
  const inputsAreInvalid = subformError !== '' || dataModelError !== '';

  return inputsAreEmpty || inputsAreInvalid;
};

export const RenderDataModelOptions = (dataModelIds?: string[]): React.ReactNode => {
  const { t } = useTranslation();
  if (!dataModelIds) {
    return (
      <option value=''>
        {t('ux_editor.component_properties.subform.data_model_empty_message')}
      </option>
    );
  }

  return (
    <>
      <option value='' hidden />
      {dataModelIds.map((dataModelId: string) => (
        <option key={dataModelId} value={dataModelId}>
          {dataModelId}
        </option>
      ))}
    </>
  );
};
