import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';

import { useApiClient } from 'nextsrc/nextpoc/app/ApiClientContext';
import { APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { useStore } from 'zustand';
import type { LayoutSettingsResponse } from 'nextsrc/nexttanstack/http-client/api-client/queries/layoutSettings';

import type { ILayoutCollection } from 'src/layout/layout';

type TaskParams = {
  taskId: string;
  pageId?: string;
};

export const Task = () => {
  const { taskId, pageId } = useParams<TaskParams>() as Required<TaskParams>;

  const navigate = useNavigate();

  const pageOrder = useStore(layoutStore, (state) => state.pageOrder);

  const setPageOrder = useStore(layoutStore, (state) => state.setPageOrder);
  const setLayouts = useStore(layoutStore, (state) => state.setLayouts);

  const layouts = useStore(layoutStore, (state) => state.layouts);

  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true);

  const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
    layoutSet?.tasks?.includes(taskId),
  );

  useEffect(() => {
    async function getLayoutDetails(layoutSetId: string) {
      try {
        const res = await apiClient.org.layoutsettingsDetail(ORG, APP, layoutSetId);

        const data = (await res.json()) as LayoutSettingsResponse;
        const layoutRes = await apiClient.org.layoutsDetail(ORG, APP, layoutSetId);
        const layoutData = (await layoutRes.json()) as ILayoutCollection;
        setPageOrder({ pages: { order: data.pages?.order } });
        setLayouts(layoutData);
        setIsLoading(false);
      } catch (e) {
        console.log(e);
        debugger;
      }
    }

    if (currentLayoutSet?.id) {
      void getLayoutDetails(currentLayoutSet.id);
    }
  }, [apiClient.org, currentLayoutSet?.id, setLayouts, setPageOrder, pageId, navigate]);

  useEffect(() => {
    if (pageId) {
      navigate(pageId);
    }
  }, [navigate, pageId]);

  if (!currentLayoutSet) {
    throw new Error('Layoutset for task not found');
  }

  if (isLoading) {
    return <h1>Loading TASK</h1>;
  }

  if (!pageOrder || !pageOrder.pages?.order?.length) {
    return <h1>No pages found in pageOrder</h1>;
  }

  if (!layouts) {
    return <h1>No layouts loaded</h1>;
  }

  return (
    <div>
      {!pageId && <Navigate to={`${pageOrder.pages.order[0]}`} />}
      <Outlet />
    </div>
  );
};
