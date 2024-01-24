import React from 'react';

import { createContext } from 'src/core/contexts/context';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { type LayoutNode } from 'src/utils/layout/LayoutNode';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type { IDataModelBindingsSimple } from 'src/layout/common.generated';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';

interface MappingTools {
  addAttachment: (uuid: string) => void;
  removeAttachment: (uuid: string) => void;
}

const noop = (node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): MappingTools => ({
  addAttachment: () => {
    if (node.parent instanceof BaseLayoutNode && node.parent.isType('RepeatingGroup')) {
      window.logError(
        'No valid data model binding for file uploader, cannot add attachment to form data. This is required ' +
          'when using a file uploader inside a repeating group.',
      );
    }
  },
  removeAttachment: () => {
    if (node.parent instanceof BaseLayoutNode && node.parent.isType('RepeatingGroup')) {
      window.logError(
        'No valid data model binding for file uploader, cannot remove attachment from form data. This is required ' +
          'when using a file uploader inside a repeating group.',
      );
    }
  },
});

/**
 * This hook is used to provide functionality for the FileUpload and FileUploadWithTag components, where uploading
 * attachments into components in repeating groups need to map the attachment IDs to the form data.
 *
 * This is because repeating groups will create repeating structures (object[]) in the form data, but attachments
 * are not part of the form data, so it would be unclear which row in a repeating group the attachment belongs to.
 * Adding the attachment ID to the form data in that repeating group makes that clear, and this hook provides the
 * functionality to call after uploading/removing attachments to update the form data.
 */
export function useAttachmentsMappedToFormData(node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): MappingTools {
  const forList = useMappingToolsForList(node);
  const forSimple = useMappingToolsForSimple(node);
  const bindings = node.item.dataModelBindings;
  if (!bindings) {
    return noop(node);
  }

  if ('list' in bindings) {
    return forList;
  }

  return forSimple;
}

function useMappingToolsForList(node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): MappingTools {
  const appendToListUnique = FD.useAppendToListUnique();
  const removeValueFromList = FD.useRemoveValueFromList();
  const field = ((node.item.dataModelBindings || {}) as IDataModelBindingsForList).list;
  return {
    addAttachment: (uuid: string) => {
      appendToListUnique({
        path: field,
        newValue: uuid,
      });
    },
    removeAttachment: (uuid: string) => {
      removeValueFromList({
        path: field,
        value: uuid,
      });
    },
  };
}

function useMappingToolsForSimple(node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): MappingTools {
  const bindings = (node.item.dataModelBindings || {}) as IDataModelBindingsSimple;
  const { setValue } = useDataModelBindings(bindings);
  return {
    addAttachment: (uuid: string) => {
      setValue('simpleBinding', uuid);
    },
    removeAttachment: () => {
      setValue('simpleBinding', undefined);
    },
  };
}

type ContextData = { mappingTools: MappingTools };

const { Provider, useCtx } = createContext<ContextData>({ name: 'AttachmentsMappedToFormDataContext', required: true });

/**
 * If you need to provide the functionality of the useAttachmentsMappedToFormData hook deep in the component tree,
 * you can use this context provider to do so.
 */
export function AttachmentsMappedToFormDataProvider({ children, mappingTools }: React.PropsWithChildren<ContextData>) {
  return <Provider value={{ mappingTools }}>{children}</Provider>;
}

export const useAttachmentsMappedToFormDataProvider = () => useCtx().mappingTools;
