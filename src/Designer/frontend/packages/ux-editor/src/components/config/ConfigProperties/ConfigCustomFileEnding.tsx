import { EditBooleanValue } from '../editModal/EditBooleanValue';
import { EditStringValue } from '../editModal/EditStringValue';
import type { FormComponent } from '../../../types/FormComponent';
import type { BaseConfigProps } from './types';
import { ComponentType } from '../../../types/ComponentType';

export interface ConfigCustomFileEndingProps extends BaseConfigProps {
  className?: string;
}

export const ConfigCustomFileEnding = ({
  component,
  handleComponentUpdate,
  className,
}: ConfigCustomFileEndingProps) => {
  if (component.type !== ComponentType.FileUpload) {
    return null;
  }

  type FileUploadComponent = FormComponent<ComponentType.FileUpload>;
  const fileUploadComponent: FileUploadComponent = component;
  const handleChange = (updatedComponent: FileUploadComponent) => {
    if (!updatedComponent.hasCustomFileEndings) {
      handleComponentUpdate({
        ...updatedComponent,
        validFileEndings: undefined,
      });
      return;
    }
    handleComponentUpdate(updatedComponent);
  };

  return (
    <>
      <EditBooleanValue
        propertyKey='hasCustomFileEndings'
        component={fileUploadComponent}
        handleComponentChange={handleChange}
        defaultValue={true}
        className={className}
      />
      {fileUploadComponent.hasCustomFileEndings && (
        <EditStringValue
          component={fileUploadComponent}
          handleComponentChange={handleComponentUpdate}
          propertyKey='validFileEndings'
          className={className}
        />
      )}
    </>
  );
};
