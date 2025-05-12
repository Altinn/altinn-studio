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
  isPendingNewSubformMutation: boolean;
};

export const isSaveButtonDisabled = ({
  newSubform,
  subformError,
  dataModelError,
  isPendingNewSubformMutation,
}: IsSaveButtonDisabledProps): boolean => {
  const { subformName, dataModelName } = newSubform;
  const inputsAreEmpty = subformName === '' || dataModelName === '';
  const inputsAreInvalid = subformError !== '' || dataModelError !== '';

  return inputsAreEmpty || inputsAreInvalid || isPendingNewSubformMutation;
};

export const RenderDataModelOptions = (dataModelIds?: string[]): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <>
      <option value='' disabled>
        {t('ux_editor.task_card.select_data_model')}
      </option>
      {dataModelIds?.map((dataModelId: string) => (
        <option key={dataModelId} value={dataModelId}>
          {dataModelId}
        </option>
      ))}
    </>
  );
};
