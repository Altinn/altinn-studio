import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

import { useFormDataPersistence } from 'nextsrc/features/form/persistence/useFormDataPersistence';
import { useExpressionValidation } from 'nextsrc/libs/form-client/react/useExpressionValidation';
import { useSchemaValidation } from 'nextsrc/libs/form-client/react/useSchemaValidation';

import type { taskLoader } from 'nextsrc/features/form/pages/task/taskLoader';

export const Task = () => {
  const { instanceOwnerPartyId, instanceGuid, dataElementId } = useLoaderData() as Awaited<
    ReturnType<typeof taskLoader>
  >;

  useFormDataPersistence({ instanceOwnerPartyId, instanceGuid, dataElementId });
  useExpressionValidation();
  useSchemaValidation();

  return <Outlet />;
};
