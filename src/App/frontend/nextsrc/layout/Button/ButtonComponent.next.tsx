import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { getLayoutSetIdForTask } from 'nextsrc/render-logic/NextForm';

import { useProcessNextMutation } from 'src/http-client/api-client/mutations/processNext';
import { layoutsQueryOptions } from 'src/http-client/api-client/queries/layouts';
import { layoutSettingsQueryOptions } from 'src/http-client/api-client/queries/layoutSettings';
import type { CompButtonExternal } from 'src/layout/Button/config.generated';

type PageParams = {
  pageKey: string;
  taskId: string;
  instanceOwnerPartyId: string;
  instanceGuid: string;
};

export function ButtonComponentNext(props: CompButtonExternal) {
  const { instanceOwnerPartyId, instanceGuid } = useParams<PageParams>() as Required<PageParams>;
  const instance = window.AltinnAppInstanceData?.instance;

  const processNextMutation = useProcessNextMutation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (props.mode === 'submit') {
    return <button>submit</button>;
  }

  if (props.mode === 'instantiate') {
    return <button>instantiate</button>;
  }

  if (props.mode === 'save') {
    return <button>save</button>;
  }

  return (
    <button
      onClick={async () => {
        if (!instance?.id) {
          return;
        }

        const processNextResult = await processNextMutation.mutateAsync({ instanceId: instance.id });
        const nextTask = processNextResult.currentTask?.elementId;

        // Handle end of process
        if (!nextTask || processNextResult.ended) {
          navigate(`/${window.org}/${window.app}/instance/${instanceOwnerPartyId}/${instanceGuid}/ProcessEnd`);
          return;
        }

        // Get the layout set for the next task
        const nextLayoutSetId = getLayoutSetIdForTask(window.AltinnAppInstanceData?.layoutSets, nextTask);
        if (!nextLayoutSetId) {
          throw new Error(`No layout set found for task: ${nextTask}`);
        }

        // Fetch layout settings and layouts in parallel
        const [nextLayoutSettings, nextLayouts] = await Promise.all([
          queryClient.ensureQueryData(layoutSettingsQueryOptions({ layoutSetId: nextLayoutSetId })),
          queryClient.ensureQueryData(layoutsQueryOptions({ layoutSetId: nextLayoutSetId })),
        ]);

        // Get first page from settings order, or fall back to first layout key
        const firstPageKey = nextLayoutSettings.pages?.order?.[0] ?? Object.keys(nextLayouts)[0];
        if (!firstPageKey) {
          throw new Error(`No pages found in layout set: ${nextLayoutSetId}`);
        }

        // Navigate to the first page of the next task
        navigate(
          `/${window.org}/${window.app}/instance/${instanceOwnerPartyId}/${instanceGuid}/${nextTask}/${firstPageKey}`,
        );
      }}
    >
      submit
    </button>
  );
}
