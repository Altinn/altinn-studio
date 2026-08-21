import React, { useState } from 'react';
import { EditDataModelBinding } from '../config/editModal/EditDataModelBinding/EditDataModelBinding';
import { StudioProperty, StudioSwitch, StudioAlert } from '@studio/components';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useText, useSelectedFormLayout } from '../../hooks';
import classes from './DataModelBindings.module.css';
import { ComponentType } from 'app-shared/types/ComponentType';
import { isItemChildOfContainer } from '../../utils/formLayoutUtils';
import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import type { PropertyDefinition, PropertyValueDefinition } from '@app/layout-contract';
import { getComponentDefinition } from '../../data/componentCatalog';

type ObjectDefinition = Extract<PropertyValueDefinition, { type: 'object' }>;

function selectDataModelBindings(
  definition: PropertyDefinition,
  multipleAttachments: boolean,
): ObjectDefinition | undefined {
  if (definition.type === 'object') return definition;
  if (definition.type !== 'union') return undefined;
  const requiredBinding = multipleAttachments ? 'list' : 'simpleBinding';
  return definition.variants.find(
    (variant): variant is ObjectDefinition =>
      variant.type === 'object' && variant.properties[requiredBinding]?.required,
  );
}

export const DataModelBindings = (): React.JSX.Element => {
  const layout = useSelectedFormLayout();
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const [multipleAttachments, setMultipleAttachments] = useState<boolean>(false);

  const t = useText();

  React.useEffect(() => {
    if (formItem.dataModelBindings?.list !== undefined) {
      setMultipleAttachments(true);
    }
  }, [formItem.dataModelBindings?.list]);

  const dataModelBindings = getComponentDefinition(formItem.type)?.properties.dataModelBindings;
  const selectedBindings = dataModelBindings
    ? selectDataModelBindings(dataModelBindings, multipleAttachments)
    : undefined;
  const dataModelBindingsProperties = selectedBindings?.properties ?? {};

  const handleMultipleAttachmentsSwitch = () => {
    const updatedValue = !multipleAttachments;
    setMultipleAttachments(updatedValue);
    const updatedComponent = {
      ...formItem,
      dataModelBindings: {
        simpleBinding: updatedValue ? undefined : { field: '', dataType: '' },
        list: updatedValue ? { field: '', dataType: '' } : undefined,
      },
    } as FormComponent;
    handleUpdate(updatedComponent);
    debounceSave(formItemId, updatedComponent);
  };

  return (
    <>
      {(formItem.type === ComponentType.FileUploadWithTag ||
        formItem.type === ComponentType.FileUpload) &&
        isItemChildOfContainer(layout, formItem.id, ComponentType.RepeatingGroup) && (
          <StudioAlert data-size='sm' data-color='warning' className={classes.alert}>
            {t('ux_editor.modal_properties_data_model_restrictions_attachment_components')}
          </StudioAlert>
        )}
      {dataModelBindings?.type === 'union' && (
        <StudioSwitch
          checked={multipleAttachments}
          onChange={handleMultipleAttachmentsSwitch}
          className={classes.switch}
          label={t('ux_editor.modal_properties_data_model_link_multiple_attachments')}
        />
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
