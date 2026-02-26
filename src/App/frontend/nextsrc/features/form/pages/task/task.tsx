import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

import { useFormDataPersistence } from 'nextsrc/features/form/persistence/useFormDataPersistence';
import { ProcessActionsProvider } from 'nextsrc/features/process/ProcessActionsContext';
import { ConfirmPage } from 'nextsrc/features/process/pages/ConfirmPage';
import { FeedbackPage } from 'nextsrc/features/process/pages/FeedbackPage';
import { useProcessNext } from 'nextsrc/features/process/useProcessNext';
import { useExpressionValidation } from 'nextsrc/libs/form-client/react/useExpressionValidation';
import { useSchemaValidation } from 'nextsrc/libs/form-client/react/useSchemaValidation';

import { isDataTask } from 'nextsrc/features/form/pages/task/taskLoader';

import type { DataTaskLoaderData, TaskLoaderData } from 'nextsrc/features/form/pages/task/taskLoader';

export const Task = () => {
  const loaderData = useLoaderData() as TaskLoaderData;

  if (isDataTask(loaderData)) {
    return <DataTask loaderData={loaderData} />;
  }

  switch (loaderData.taskType) {
    case 'confirmation':
      return <ConfirmPage />;
    case 'feedback':
      return <FeedbackPage />;
    default:
      return (
        <div data-testid='UnknownTaskType'>
          <p>Ukjent oppgavetype: {loaderData.taskType}</p>
        </div>
      );
  }
};

function DataTask({ loaderData }: { loaderData: DataTaskLoaderData }) {
  const { instanceOwnerPartyId, instanceGuid, dataElementId } = loaderData;

  useFormDataPersistence({ instanceOwnerPartyId, instanceGuid, dataElementId });
  useExpressionValidation();
  useSchemaValidation();

  const { submit, isSubmitting } = useProcessNext({ instanceOwnerPartyId, instanceGuid });

  return (
    <ProcessActionsProvider value={{ submit, isSubmitting }}>
      <Outlet />
    </ProcessActionsProvider>
  );
}
