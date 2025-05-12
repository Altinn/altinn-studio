import React, { useId } from 'react';
import classes from './SelectDataModelBinding.module.css';
import { FormField } from 'app-shared/components/FormField';
import { StudioNativeSelect } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../../hooks';
import { useGetBindableDataTypes } from '../../../../../hooks/useGetBindableDataTypes';
import { useValidDataModels } from '../../../../../hooks/useValidDataModels';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';

type SelectDataModelProps = {
  currentDataModel: string;
  bindingKey: string;
  handleBindingChange: (dataModelBindings: ExplicitDataModelBinding) => void;
};

export const SelectDataModelBinding = ({
  currentDataModel,
  bindingKey,
  handleBindingChange,
}: SelectDataModelProps): React.JSX.Element => {
  const { t } = useTranslation();
  const id = useId();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { selectedDataModel } = useValidDataModels(currentDataModel);
  const { defaultDataTypeName, bindableDataTypes } = useGetBindableDataTypes(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}/dataType`;

  const handleDataModelChange = (newDataModel: string) => {
    const dataModelBinding = {
      field: '',
      dataType: newDataModel,
    };
    handleBindingChange(dataModelBinding);
  };

  return (
    <FormField
      id={id}
      onChange={handleDataModelChange}
      value={selectedDataModel}
      propertyPath={propertyPath}
      label={t('ux_editor.modal_properties_data_model_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          className={classes.selectDataModel}
          {...fieldProps}
          label={t('ux_editor.modal_properties_data_model_binding')}
          id={id}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          size='small'
        >
          {defaultDataTypeName && (
            <option key={defaultDataTypeName} value={defaultDataTypeName}>
              {defaultDataTypeName}
            </option>
          )}
          {bindableDataTypes.map((dataType) => (
            <option key={dataType.id} value={dataType.id}>
              {dataType.id}
            </option>
          ))}
        </StudioNativeSelect>
      )}
    />
  );
};
