import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { EditDataModelBindings } from '../config/editModal/EditDataModelBindings/EditDataModelBindings';
import { StudioSpinner } from '@studio/components';
import { Alert, Switch } from '@digdir/design-system-react';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useText } from '../../hooks';
import classes from './DataModelBindings.module.css';
import { useFormLayout } from '../../hooks/useFormLayoutsSelector';
import { ComponentType } from 'app-shared/types/ComponentType';
import { isItemChildOfContainer } from '../../utils/formLayoutUtils';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import type { FormComponent } from '../../types/FormComponent';

export const DataModelBindings = (): React.JSX.Element => {
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const layout = useFormLayout(selectedLayout);
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const { data: schema } = useComponentSchemaQuery(formItem.type);
  const [multipleAttachments, setMultipleAttachments] = useState<boolean>(false);
  const t = useText();

  useEffect(() => {
    if (formItem.dataModelBindings?.list !== undefined) {
      setMultipleAttachments(true);
    }
  }, [formItem.dataModelBindings?.list]);

  if (!schema) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  const { dataModelBindings } = schema.properties;

  if (!dataModelBindings) {
    return <Alert>{t('ux_editor.modal_properties_data_model_binding_not_present')}</Alert>;
  }

  let dataModelBindingsProperties = dataModelBindings?.properties;

  if (dataModelBindings.anyOf) {
    const { properties } = Object.values(dataModelBindings.anyOf).find((dataModelProp: any) =>
      (dataModelProp.required as string[]).includes(multipleAttachments ? 'list' : 'simpleBinding'),
    ) as any;
    dataModelBindingsProperties = properties;
  }

  const handleMultipleAttachmentsSwitch = () => {
    const updatedValue = !multipleAttachments;
    setMultipleAttachments(updatedValue);
    const updatedComponent = {
      ...formItem,
      dataModelBindings: {
        simpleBinding: !updatedValue ? '' : undefined,
        list: updatedValue ? '' : undefined,
      },
    };
    handleUpdate(
      updatedComponent as FormComponent<ComponentType.FileUpload | ComponentType.FileUploadWithTag>,
    );
    debounceSave(
      formItemId,
      updatedComponent as FormComponent<ComponentType.FileUpload | ComponentType.FileUploadWithTag>,
    );
  };

  return (
    dataModelBindingsProperties && (
      <div className={classes.container}>
        {(formItem.type === ComponentType.FileUploadWithTag ||
          formItem.type === ComponentType.FileUpload) &&
          isItemChildOfContainer(layout, formItem, ComponentType.RepeatingGroup) && (
            <Alert severity='warning'>
              {t('ux_editor.modal_properties_data_model_restrictions_attachment_components')}
            </Alert>
          )}
        {dataModelBindings.anyOf && (
          <Switch
            checked={multipleAttachments}
            onChange={handleMultipleAttachmentsSwitch}
            className={classes.switch}
          >
            {t('ux_editor.modal_properties_data_model_link_multiple_attachments')}
          </Switch>
        )}
        {Object.keys(dataModelBindingsProperties).map((propertyKey: string) => {
          return (
            <div
              className={classes.dataModelBindings}
              key={`${formItem.id}-datamodel-${propertyKey}`}
            >
              <EditDataModelBindings
                component={formItem}
                handleComponentChange={async (updatedComponent) => {
                  handleUpdate(updatedComponent);
                  debounceSave(formItemId, updatedComponent);
                }}
                editFormId={formItemId}
                helpText={dataModelBindingsProperties[propertyKey]?.description}
                renderOptions={{
                  key: propertyKey,
                  label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
    )
  );
};
