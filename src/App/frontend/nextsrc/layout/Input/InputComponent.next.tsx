import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useFormDataPatch } from 'nextsrc/hooks/useFormDataPatch';

import type { CompInputExternal } from 'src/layout/Input/config.generated';

export function InputComponentNext(props: CompInputExternal) {
  const { taskId } = useParams();

  // Handle both old string format and new object format for simpleBinding
  const simpleBinding = props.dataModelBindings.simpleBinding;
  const isStringBinding = typeof simpleBinding === 'string';
  const bindingDataType = isStringBinding ? undefined : simpleBinding?.dataType;
  const field = isStringBinding ? simpleBinding : simpleBinding?.field;

  // Fall back to current task's layout set dataType if not specified in binding
  const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets?.sets.find((set) => set.tasks?.includes(taskId!));
  const dataType = bindingDataType ?? currentLayoutSet?.dataType;

  const { serverValue, patchFormData, isPending } = useFormDataPatch({ field, dataType });

  // Local state for optimistic updates
  const [localValue, setLocalValue] = useState<string | undefined>(undefined);
  const displayValue = localValue ?? String(serverValue ?? '');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    try {
      await patchFormData(newValue);
      // Reset local value after successful save
      setLocalValue(undefined);
    } catch (error) {
      console.error('Failed to save form data:', error);
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
      {isPending && <span> Saving...</span>}
    </div>
  );
}
