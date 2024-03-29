import React from 'react';
import { useSelector } from 'react-redux';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/design-system-react';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings/EditTextResourceBindings';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { StudioSpinner } from '@studio/components';
import { EditOptions } from '../config/editModal/EditOptions';
import type { FormComponentBase } from '../../types/FormComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';

export const Text = () => {
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
  const { t } = useTranslation();

  const { data: schema } = useComponentSchemaQuery(form.type);
  const selectedLayout = useSelector(selectedLayoutNameSelector);

  if (!schema) {
    return (
      <StudioSpinner
        showSpinnerTitle
        spinnerTitle={t('ux_editor.properties_panel.texts.loading')}
      />
    );
  }

  if (!schema?.properties) {
    return <Alert>{t('ux_editor.properties_panel.texts.no_properties')}</Alert>;
  }

  return (
    <>
      {schema.properties.textResourceBindings?.properties && (
        <EditTextResourceBindings
          component={form}
          handleComponentChange={async (updatedComponent) => {
            handleUpdate(updatedComponent);
            debounceSave(formId, updatedComponent);
          }}
          textResourceBindingKeys={Object.keys(schema.properties.textResourceBindings.properties)}
          editFormId={formId}
          layoutName={selectedLayout}
        />
      )}
      {(schema.properties.options || schema.properties.optionsId) && (
        <EditOptions
          component={
            form as
              | (FormComponentBase<ComponentType.Checkboxes> &
                  ComponentSpecificConfig<ComponentType.Checkboxes>)
              | (FormComponentBase<ComponentType.RadioButtons> &
                  ComponentSpecificConfig<ComponentType.RadioButtons>)
          }
          handleComponentChange={async (updatedComponent) => {
            handleUpdate(updatedComponent);
            debounceSave(formId, updatedComponent);
          }}
          editFormId={formId}
          layoutName={selectedLayout}
          renderOptions={{
            onlyCodeListOptions: schema.properties.optionsId && !schema.properties.options,
          }}
        />
      )}
    </>
  );
};
