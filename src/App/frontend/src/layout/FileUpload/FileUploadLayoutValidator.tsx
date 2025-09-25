import { useEffect } from 'react';
import type { JSX } from 'react';

import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, NodeValidationProps } from 'src/layout/layout';

export function FileUploadLayoutValidator(
  props: NodeValidationProps<'FileUpload' | 'FileUploadWithTag'>,
): JSX.Element | null {
  const { intermediateItem, externalItem } = props;
  const allPages = useLayouts();
  const binding = extractBinding(externalItem);
  const { langAsString } = useLanguage();
  const addError = NodesInternal.useAddError();

  const othersWithSameBinding: string[] = [];
  if (binding) {
    for (const page of Object.values(allPages)) {
      for (const component of page ?? []) {
        if (component.id === externalItem.id) {
          continue;
        }
        if (component.type !== 'FileUpload' && component.type !== 'FileUploadWithTag') {
          continue;
        }
        const otherBinding = extractBinding(component);
        if (otherBinding && otherBinding.dataType === binding.dataType && otherBinding.field === binding.field) {
          othersWithSameBinding.push(component.id);
        }
      }
    }
  }

  const othersWithSameBindingMemo = useShallowMemo(othersWithSameBinding);

  useEffect(() => {
    let error: string | null = null;
    if (othersWithSameBindingMemo.length >= 1) {
      const othersList = othersWithSameBindingMemo.map((id) => `'${id}'`).join(', ');
      error = langAsString('config_error.file_upload_same_binding', [othersList]);
    }

    if (error) {
      addError(error, intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${intermediateItem.id}': ${error}`);
    }
  }, [addError, langAsString, intermediateItem.id, othersWithSameBindingMemo]);

  return null;
}

function extractBinding(component: CompExternal<'FileUpload' | 'FileUploadWithTag'>): IDataModelReference | undefined {
  if (component.dataModelBindings && 'simpleBinding' in component.dataModelBindings) {
    return component.dataModelBindings.simpleBinding;
  } else if (component.dataModelBindings && 'list' in component.dataModelBindings) {
    return component.dataModelBindings.list;
  }
  return undefined;
}
