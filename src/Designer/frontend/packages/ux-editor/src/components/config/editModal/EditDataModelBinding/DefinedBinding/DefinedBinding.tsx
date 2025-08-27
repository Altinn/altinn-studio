import React from 'react';
import { StudioSpinner } from 'libs/studio-components-legacy/src';
import { StudioProperty } from 'libs/studio-components/src';
import { LinkIcon } from 'libs/studio-icons/src';
import classes from './DefinedBinding.module.css';
import { useTranslation } from 'react-i18next';
import {
  getDataModelFields,
  validateSelectedDataField,
} from '@altinn/ux-editor/utils/dataModelUtils';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';

export type DefinedBindingProps = {
  onClick: () => void;
  label: string;
  internalBindingFormat: ExplicitDataModelBinding;
  componentType: ComponentType;
  bindingKey: string;
};

export const DefinedBinding = ({
  onClick,
  label,
  internalBindingFormat,
  componentType,
  bindingKey,
}: DefinedBindingProps) => {
  const { t } = useTranslation();
  const title = t('right_menu.data_model_bindings_edit', { binding: label });
  const { field: currentDataModelField, dataType: currentDataModel } = internalBindingFormat;
  const { dataModelMetadata, isDataModelValid, isLoadingDataModels } =
    useValidDataModels(currentDataModel);

  if (isLoadingDataModels) {
    return (
      <StudioSpinner
        showSpinnerTitle={false}
        spinnerTitle={t('ux_editor.modal_properties_loading')}
      />
    );
  }

  const dataModelFields = getDataModelFields({ componentType, bindingKey, dataModelMetadata });
  const isFieldValid = validateSelectedDataField(currentDataModelField, dataModelFields);
  const isBindingError = !isFieldValid || !isDataModelValid;

  return (
    <StudioProperty.Button
      className={isBindingError ? classes.error : ''}
      aria-label={title}
      onClick={onClick}
      property={t('ux_editor.modal_properties_data_model_field_binding_for', {
        componentName: label,
      })}
      title={title}
      icon={<LinkIcon />}
      value={currentDataModelField}
    />
  );
};
