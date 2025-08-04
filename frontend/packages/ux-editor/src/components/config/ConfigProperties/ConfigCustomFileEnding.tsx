import React from 'react';
import { EditBooleanValue } from '../editModal/EditBooleanValue';
import { EditStringValue } from '../editModal/EditStringValue';
import type { FormComponent } from '../../../types/FormComponent';
import type { BaseConfigProps } from './types';

export interface ConfigCustomFileEndingProps extends BaseConfigProps {
  className?: string;
}

export const ConfigCustomFileEnding = ({
  component,
  handleComponentUpdate,
  className,
}: ConfigCustomFileEndingProps) => {
  const handleChange = (updatedComponent: FormComponent) => {
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
        component={component}
        handleComponentChange={handleChange}
        defaultValue={true}
        className={className}
      />
      {component['hasCustomFileEndings'] && (
        <EditStringValue
          component={component}
          handleComponentChange={handleComponentUpdate}
          propertyKey='validFileEndings'
          className={className}
        />
      )}
    </>
  );
};
