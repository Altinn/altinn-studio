import React from 'react';
import { useParams } from 'react-router-dom';

import dot from 'dot-object';

import { useFormData } from 'src/http-client/api-client/queries/formData';
import { useInstanceData } from 'src/http-client/api-client/queries/instanceData';
import type { CompInputExternal } from 'src/layout/Input/config.generated';

export function InputComponentNext(props: CompInputExternal) {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const instance = useInstanceData(
    instanceOwnerPartyId && instanceGuid ? { instanceOwnerPartyId, instanceGuid } : undefined,
  );

  // Find the data element that matches the binding's dataType
  const { dataType, field } = props.dataModelBindings.simpleBinding;
  const dataElement = instance?.data.find((el) => el.dataType === dataType);

  // Construct form data URL
  const formDataUrl =
    instanceOwnerPartyId && instanceGuid && dataElement
      ? `/instances/${instanceOwnerPartyId}/${instanceGuid}/data/${dataElement.id}`
      : undefined;

  const formData = useFormData(formDataUrl ? { url: formDataUrl } : undefined);

  // Resolve the value from form data using the field path
  const value = formData ? dot.pick(field, formData) : undefined;

  return (
    <div>
      <p>
        <strong>Field:</strong> {field}
      </p>
      <p>
        <strong>Value:</strong> {String(value ?? '')}
      </p>
      <input
        type='text'
        value={String(value ?? '')}
        readOnly
      />
    </div>
  );
}
