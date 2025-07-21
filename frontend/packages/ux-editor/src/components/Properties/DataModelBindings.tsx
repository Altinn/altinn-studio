import React, { useState } from 'react';
import { EditDataModelBinding } from '../config/editModal/EditDataModelBinding/EditDataModelBinding';
import { StudioProperty } from '@studio/components-legacy';
import { Alert, Switch } from '@digdir/designsystemet-react';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useText, useSelectedFormLayout } from '../../hooks';
import classes from './DataModelBindings.module.css';
import { ComponentType } from 'app-shared/types/ComponentType';
import { isItemChildOfContainer } from '../../utils/formLayoutUtils';
import type { FormItem } from '../../types/FormItem';

export const DataModelBindings = (): React.JSX.Element => {
  const layout = useSelectedFormLayout();
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const { data: schema } = useComponentSchemaQuery(formItem.type);
  const [multipleAttachments, setMultipleAttachments] = useState<boolean>(false);

  const t = useText();

  React.useEffect(() => {
    if (formItem.dataModelBindings?.list !== undefined) {
      setMultipleAttachments(true);
    }
  }, [formItem.dataModelBindings?.list]);

  const { dataModelBindings } = schema.properties;
  let dataModelBindingsProperties = dataModelBindings?.properties;

  if (dataModelBindings?.anyOf) {
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
      updatedComponent as FormItem<ComponentType.FileUpload | ComponentType.FileUploadWithTag>,
    );
    debounceSave(
      formItemId,
      updatedComponent as FormItem<ComponentType.FileUpload | ComponentType.FileUploadWithTag>,
    );
  };

  return (
    <>
      {(formItem.type === ComponentType.FileUploadWithTag ||
        formItem.type === ComponentType.FileUpload) &&
        isItemChildOfContainer(layout, formItem.id, ComponentType.RepeatingGroup) && (
          <Alert size='small' severity='warning' className={classes.alert}>
            {t('ux_editor.modal_properties_data_model_restrictions_attachment_components')}
          </Alert>
        )}
      {dataModelBindings.anyOf && (
        <Switch
          size='small'
          checked={multipleAttachments}
          onChange={handleMultipleAttachmentsSwitch}
          className={classes.switch}
        >
          {t('ux_editor.modal_properties_data_model_link_multiple_attachments')}
        </Switch>
      )}
      <StudioProperty.Group>
        {Object.keys(dataModelBindingsProperties).map((propertyKey: string) => {
          return (
            <EditDataModelBinding
              key={`${formItem.id}-data-model-${propertyKey}`}
              component={formItem}
              handleComponentChange={async (updatedComponent, mutateOptions) => {
                handleUpdate(updatedComponent);
                debounceSave(formItemId, updatedComponent, mutateOptions);
              }}
              editFormId={formItemId}
              renderOptions={{
                key: propertyKey,
                label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
              }}
            />
          );
        })}
      </StudioProperty.Group>
    </>
  );
};
