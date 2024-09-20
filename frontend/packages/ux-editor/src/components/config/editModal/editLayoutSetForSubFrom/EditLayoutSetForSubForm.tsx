import React from 'react';
import { UndefinedBinding } from '@altinn/ux-editor/components/config/editModal/EditDataModelBinding/UndefinedBinding';
import { EditBinding } from '@altinn/ux-editor/components/config/editModal/EditDataModelBinding/EditBinding';
import { DefinedBinding } from '@altinn/ux-editor/components/config/editModal/EditDataModelBinding/DefinedBinding';

export const EditLayoutSetForSubForm = () => {
  return (
    <>
      {!internalBindingFormat.field && !dataModelSelectVisible ? (
        <UndefinedBinding
          onClick={() => setDataModelSelectVisible(true)}
          label={labelSpecificText}
        />
      ) : dataModelSelectVisible ? (
        <EditBinding
          bindingKey={bindingKey}
          component={component}
          helpText={helpText}
          label={labelSpecificText}
          handleComponentChange={handleComponentChange}
          onSetDataModelSelectVisible={setDataModelSelectVisible}
          internalBindingFormat={internalBindingFormat}
        />
      ) : (
        <DefinedBinding
          label={labelSpecificText}
          onClick={() => setDataModelSelectVisible(true)}
          internalBindingFormat={internalBindingFormat}
          componentType={component.type}
          bindingKey={bindingKey}
        />
      )}
    </>
  );
};
