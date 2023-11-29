import React from 'react';

import { createContext } from 'src/core/contexts/context';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { IComponentProps } from 'src/layout';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>;
  handleDataChange: IComponentProps<'FileUpload' | 'FileUploadWithTag'>['handleDataChange'];
}

interface MappingTools {
  addAttachment: (uuid: string) => void;
  removeAttachment: (uuid: string) => void;
}

const noop = (node: LayoutNode<'FileUpload' | 'FileUploadWithTag'>): MappingTools => ({
  addAttachment: () => {
    if (node.parent instanceof LayoutNodeForGroup && node.parent.isRepGroup()) {
      window.logError(
        'No valid data model binding for file uploader, cannot add attachment to form data. This is required ' +
          'when using a file uploader inside a repeating group.',
      );
    }
  },
  removeAttachment: () => {
    if (node.parent instanceof LayoutNodeForGroup && node.parent.isRepGroup()) {
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
export function useAttachmentsMappedToFormData(props: Props): MappingTools {
  const forList = useMappingToolsForList(props);
  const forSimple = useMappingToolsForSimple(props);
  const bindings = props.node.item.dataModelBindings;
  if (!bindings) {
    return noop(props.node);
  }

  if ('list' in bindings) {
    return forList;
  }

  return forSimple;
}

function useMappingToolsForList({ node }: Props): MappingTools {
  const dispatch = useAppDispatch();
  const field = ((node.item.dataModelBindings || {}) as IDataModelBindingsForList).list;
  return {
    addAttachment: (uuid: string) => {
      dispatch(
        FormDataActions.updateAddToList({
          field,
          itemToAdd: uuid,
          componentId: node.item.id,
        }),
      );
    },
    removeAttachment: (uuid: string) => {
      dispatch(
        FormDataActions.updateRemoveFromList({
          field,
          itemToRemove: uuid,
          componentId: node.item.id,
        }),
      );
    },
  };
}

function useMappingToolsForSimple({ handleDataChange }: Props): MappingTools {
  return {
    addAttachment: (uuid: string) => {
      handleDataChange(uuid);
    },
    removeAttachment: () => {
      handleDataChange(undefined);
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
