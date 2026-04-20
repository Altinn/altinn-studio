import React from 'react';
import { useLoaderData } from 'react-router';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import type { InstanceSelectionLoaderResult } from 'src/routes/instance-selection/instance-selection.loader';

export const Component = () => {
  const loaderData = useLoaderData<InstanceSelectionLoaderResult>();

  if (loaderData?.error === 'forbidden') {
    return <MissingRolesError />;
  }

  if (loaderData?.error === 'forbidden-validation') {
    return <InstantiateValidationError validationResult={loaderData.validationResult} />;
  }

  if (loaderData?.error === 'instantiation-failed') {
    return <DisplayError error={loaderData.cause} />;
  }

  return <InstanceSelectionWrapper />;
};
