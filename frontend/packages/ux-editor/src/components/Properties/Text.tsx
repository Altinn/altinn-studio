import React from 'react';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useTranslation } from 'react-i18next';
import { Alert, Heading } from '@digdir/designsystemet-react';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings/EditTextResourceBindings';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components';
import { EditOptions } from '../config/editModal/EditOptions';
import type { FormComponent, FormComponentBase } from '../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import { useAppContext } from '../../hooks';
import { EditImage } from '../config/editModal/EditImage';
import classes from './Text.module.css';
import { EditSubFormTableColumns } from './EditSubFormTableColumns';
import { type FormContainer } from '@altinn/ux-editor/types/FormContainer';

export const Text = () => {
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
  const { t } = useTranslation();

  const { data: schema } = useComponentSchemaQuery(form.type);
  const { selectedFormLayoutName } = useAppContext();

  const handleComponentChange = async (updatedComponent: FormContainer | FormComponent) => {
    handleUpdate(updatedComponent);
    debounceSave(formId, updatedComponent);
  };

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
      <Heading level={2} size='2xs' className={classes.heading}>
        {t('ux_editor.properties_panel.texts.sub_title_texts')}
      </Heading>
      {schema.properties.textResourceBindings?.properties && (
        <EditTextResourceBindings
          component={form}
          handleComponentChange={handleComponentChange}
          textResourceBindingKeys={Object.keys(schema.properties.textResourceBindings.properties)}
          editFormId={formId}
          layoutName={selectedFormLayoutName}
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
          handleComponentChange={handleComponentChange}
          editFormId={formId}
          layoutName={selectedFormLayoutName}
          renderOptions={{
            onlyCodeListOptions: schema.properties.optionsId && !schema.properties.options,
          }}
        />
      )}
      {form.type === ComponentType.Image && (
        <>
          <Heading level={2} size='2xs' className={classes.heading}>
            {t('ux_editor.properties_panel.texts.sub_title_images')}
          </Heading>
          <EditImage component={form} handleComponentChange={handleComponentChange} />
        </>
      )}
      {form.type === ComponentType.SubForm && (
        <EditSubFormTableColumns component={form} handleComponentChange={handleComponentChange} />
      )}
    </>
  );
};
