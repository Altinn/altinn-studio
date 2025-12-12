import { useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import dot from 'dot-object';

import { usePatchMultipleFormDataMutation } from 'src/http-client/api-client/mutations/patchMultipleFormData';
import { formDataKeys, useFormData } from 'src/http-client/api-client/queries/formData';
import { useInstanceData } from 'src/http-client/api-client/queries/instanceData';

// Build a JSON patch path and nested value from a dot notation field path
// For ADD operations (when path doesn't exist): use root path with nested value
// e.g., "group1.group2.field.value" with value "d" becomes:
//   path: "/group1"
//   value: { group2: { field: { value: "d" } } }
function buildAddPatch(dotPath: string, value: unknown): { path: string; value: unknown } {
  const parts = dotPath.split('.');
  const rootPart = parts[0];
  const remainingParts = parts.slice(1);

  // Build nested object from remaining parts
  let nestedValue: unknown = value;
  for (let i = remainingParts.length - 1; i >= 0; i--) {
    nestedValue = { [remainingParts[i]]: nestedValue };
  }

  return {
    path: `/${rootPart}`,
    value: nestedValue,
  };
}

// Convert dot notation to JSON Pointer path for REPLACE operations
// e.g., "group1.group2.field.value" -> "/group1/group2/field/value"
function toJsonPointer(dotPath: string): string {
  return `/${dotPath.replace(/\./g, '/')}`;
}

type UseFormDataPatchParams = {
  field: string | undefined;
  dataType: string | undefined;
};

type UseFormDataPatchResult = {
  formData: unknown;
  serverValue: unknown;
  patchFormData: (newValue: unknown) => Promise<void>;
  isPending: boolean;
};

export function useFormDataPatch({ field, dataType }: UseFormDataPatchParams): UseFormDataPatchResult {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const queryClient = useQueryClient();

  const instance = useInstanceData(
    instanceOwnerPartyId && instanceGuid ? { instanceOwnerPartyId, instanceGuid } : undefined,
  );

  // Find the data element that matches the dataType
  const dataElement = instance?.data.find((el) => el.dataType === dataType);

  // Construct URLs
  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
  const formDataUrl = instanceId && dataElement ? `/instances/${instanceId}/data/${dataElement.id}` : undefined;

  const formData = useFormData(formDataUrl ? { url: formDataUrl } : undefined);
  const patchMutation = usePatchMultipleFormDataMutation();

  // Resolve the value from form data using the field path
  const serverValue = formData && field ? dot.pick(field, formData) : undefined;

  async function patchFormData(newValue: unknown) {
    if (!instanceOwnerPartyId || !instanceGuid || !dataElement || !field) {
      console.warn('Missing data for patch:', {
        dataElement,
        field,
        instanceOwnerPartyId,
        instanceGuid,
        instanceId,
        dataType,
        instanceDataElements: instance?.data,
      });
      return;
    }

    // For ADD: use root path with nested value (when field doesn't exist yet)
    // For REPLACE: use full JSON pointer path to the leaf value
    const currentServerValue = formData && field ? dot.pick(field, formData) : undefined;

    const patch =
      currentServerValue === undefined
        ? (() => {
            const { path, value } = buildAddPatch(field, newValue);
            return [{ op: 'add' as const, path, value }];
          })()
        : [
            { op: 'test' as const, path: toJsonPointer(field), value: currentServerValue },
            { op: 'replace' as const, path: toJsonPointer(field), value: newValue },
          ];

    const res = await patchMutation.mutateAsync({
      instanceOwnerPartyId,
      instanceGuid,
      patches: [
        {
          dataElementId: dataElement.id,
          patch,
        },
      ],
      ignoredValidators: ['DataAnnotations', 'Required', 'Expression'],
    });

    // Update query cache with response data instead of refetching
    if (formDataUrl && res.newDataModels) {
      const updatedData = res.newDataModels[dataElement.id];
      if (updatedData) {
        queryClient.setQueryData(formDataKeys.byUrl({ url: formDataUrl }), updatedData);
      }
    }
  }

  return {
    formData,
    serverValue,
    patchFormData,
    isPending: patchMutation.isPending,
  };
}
