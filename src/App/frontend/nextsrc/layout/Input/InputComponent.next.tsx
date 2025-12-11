import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import dot from 'dot-object';

import { usePatchMultipleFormDataMutation } from 'src/http-client/api-client/mutations/patchMultipleFormData';
import { formDataKeys, useFormData } from 'src/http-client/api-client/queries/formData';
import { useInstanceData } from 'src/http-client/api-client/queries/instanceData';
import type { CompInputExternal } from 'src/layout/Input/config.generated';

// Convert dot notation path to JSON Pointer path
// e.g., "person.name.value" -> "/person/name/value"
function toJsonPointer(dotPath: string): string {
  return `/${dotPath.replace(/\./g, '/')}`;
}

export function InputComponentNext(props: CompInputExternal) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const queryClient = useQueryClient();

  const instance = useInstanceData(
    instanceOwnerPartyId && instanceGuid ? { instanceOwnerPartyId, instanceGuid } : undefined,
  );

  // Handle both old string format and new object format for simpleBinding
  const simpleBinding = props.dataModelBindings.simpleBinding;
  const isStringBinding = typeof simpleBinding === 'string';
  const bindingDataType = isStringBinding ? undefined : simpleBinding?.dataType;
  const field = isStringBinding ? simpleBinding : simpleBinding?.field;

  // Fall back to current task's layout set dataType if not specified in binding
  const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets?.sets.find((set) => set.tasks?.includes(taskId!));
  const dataType = bindingDataType ?? currentLayoutSet?.dataType;

  // Find the data element that matches the dataType
  const dataElement = instance?.data.find((el) => el.dataType === dataType);

  // Construct URLs
  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
  const formDataUrl = instanceId && dataElement ? `/instances/${instanceId}/data/${dataElement.id}` : undefined;
  const patchUrl = instanceId ? `/instances/${instanceId}/data` : undefined;

  const formData = useFormData(formDataUrl ? { url: formDataUrl } : undefined);
  const patchMutation = usePatchMultipleFormDataMutation();

  // Resolve the value from form data using the field path
  const serverValue = formData && field ? dot.pick(field, formData) : undefined;

  // Local state for optimistic updates
  const [localValue, setLocalValue] = useState<string | undefined>(undefined);
  const displayValue = localValue ?? String(serverValue ?? '');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (!patchUrl || !dataElement || !field) {
      console.warn('Missing data for patch:', {
        patchUrl,
        dataElement,
        field,
        simpleBinding,
        dataModelBindings: props.dataModelBindings,
        instanceOwnerPartyId,
        instanceGuid,
        instanceId,
        dataType,
        instanceDataElements: instance?.data,
      });
      return;
    }

    try {
      await patchMutation.mutateAsync({
        url: patchUrl,
        data: {
          patches: [
            {
              dataElementId: dataElement.id,
              patch:
                serverValue !== undefined
                  ? [
                      // Test that the value hasn't changed since we read it
                      { op: 'test', path: toJsonPointer(field), value: serverValue },
                      { op: 'replace', path: toJsonPointer(field), value: newValue },
                    ]
                  : [
                      { op: 'test', path: toJsonPointer(field), value: serverValue },
                      // Value doesn't exist yet, just add it
                      { op: 'replace', path: toJsonPointer(field), value: newValue },
                    ],
            },
          ],
        },
      });

      // Invalidate form data cache to refetch
      if (formDataUrl) {
        await queryClient.invalidateQueries({ queryKey: formDataKeys.byUrl({ url: formDataUrl }) });
      }

      // Reset local value after successful save
      setLocalValue(undefined);
    } catch (error) {
      console.error('Failed to save form data:', error);
      console.warn('PATCH ERROR DEBUG:', {
        patchUrl,
        dataElement,
        field,
        simpleBinding,
        dataModelBindings: props.dataModelBindings,
        instanceOwnerPartyId,
        instanceGuid,
        instanceId,
        dataType,
        instanceDataElements: instance?.data,
      });
    }
  };

  return (
    <div>
      <p>
        <strong>Field:</strong> {field}
      </p>
      <p>
        <strong>Value:</strong> {displayValue}
      </p>
      <input
        type='text'
        value={displayValue}
        onChange={handleChange}
      />
      {patchMutation.isPending && <span> Saving...</span>}
    </div>
  );
}
