import React from 'react';
import { EditBooleanValue } from '../editModal/EditBooleanValue';
import { EditStringValue } from '../editModal/EditStringValue';
import type { FormComponent } from '../../../types/FormComponent';
import type { BaseConfigProps } from './types';

export interface ConfigCustomFileEndingProps extends BaseConfigProps {
  hasCustomFileEndings: any;
}

export const ConfigCustomFileEnding = ({
  component,
  handleComponentUpdate,
  hasCustomFileEndings,
}: ConfigCustomFileEndingProps) => {
  if (!hasCustomFileEndings) return null;

  return (
    <>
      <EditBooleanValue
        propertyKey='hasCustomFileEndings'
        component={component}
        defaultValue={hasCustomFileEndings.default}
        handleComponentChange={(updatedComponent: FormComponent) => {
          if (!updatedComponent.hasCustomFileEndings) {
            handleComponentUpdate({
              ...updatedComponent,
              validFileEndings: undefined,
            });
            return;
          }
          handleComponentUpdate(updatedComponent);
        }}
      />
      {component['hasCustomFileEndings'] && (
        <EditStringValue
          component={component}
          handleComponentChange={handleComponentUpdate}
          propertyKey='validFileEndings'
        />
      )}
    </>
  );
};
