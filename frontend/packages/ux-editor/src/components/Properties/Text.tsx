import React from 'react';
import { useSelector } from 'react-redux';
import { useFormContext } from '../../containers/FormContext';
import { useTranslation } from 'react-i18next';
import { Heading } from '@digdir/design-system-react';
import { EditTextResourceBindings } from '../config/editModal/EditTextResourceBindings';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { StudioSpinner } from '@studio/components';
import { getCurrentEditId } from '../../selectors/textResourceSelectors';
import { TextResourceEdit } from '../TextResourceEdit';

export const Text = () => {
  const { formId, form, handleUpdate, debounceSave } = useFormContext();
  const { t } = useTranslation();

  useLayoutSchemaQuery(); // Ensure we load the layout schemas so that component schemas can be loaded
  const { data: schema, isPending } = useComponentSchemaQuery(form.type);
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const editId = useSelector(getCurrentEditId);

  if (editId) return <TextResourceEdit />;
  if (!schema?.properties) return null;

  return (
    <>
      {isPending && <StudioSpinner spinnerText={t('general.loading')} />}
      {schema.properties.textResourceBindings?.properties && !isPending && (
        <>
          <Heading level={3} size='xxsmall'>
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
        </>
      )}
    </>
  );
};
