import React from 'react';
import { useSelector } from 'react-redux';
import { useFormContext } from '../../containers/FormContext';
import { useTranslation } from 'react-i18next';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { StudioSpinner } from '@studio/components';
import { getCurrentEditId } from '../../selectors/textResourceSelectors';
import { TextResourceEdit } from '../TextResourceEdit';
import { EditOptions } from '../config/editModal/EditOptions';
import classes from './Text.module.css';
import type { FormComponentBase } from '../../types/FormComponent';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { OptionsComponentBase } from 'app-shared/types/ComponentSpecificConfig';

export const Text = () => {
  const { formId, form, handleUpdate, debounceSave } = useFormContext();
  const { t } = useTranslation();

  const { data: schema } = useComponentSchemaQuery(form.type);
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const editId = useSelector(getCurrentEditId);

  if (editId) return <TextResourceEdit />;

  if (!schema) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  if (!schema?.properties) {
    return <Paragraph>{t('ux_editor.properties_panel.texts.no_properties')}</Paragraph>;
  }

  return (
    <>
      {schema.properties.textResourceBindings?.properties && (
        <div className={classes.textResourceContainer}>
          <Heading level={3} size='xxsmall' spacing>
            {t('general.text')}
          </Heading>
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
        </div>
      )}
      {(schema.properties.options || schema.properties.optionsId) && (
        <>
          <Heading level={3} size='xxsmall' spacing>
            {t('ux_editor.properties_panel.texts.options_title')}
          </Heading>
          <EditOptions
            component={
              form as
                | (FormComponentBase<ComponentType.Checkboxes> & OptionsComponentBase)
                | (FormComponentBase<ComponentType.RadioButtons> & OptionsComponentBase)
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
        </>
      )}
    </>
  );
};
