import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';

import { useApiClient } from 'nextsrc/nextpoc/app/ApiClientContext';
import { APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { useStore } from 'zustand';

// Adjust to match your real shape:
type TaskParams = {
  taskId: string;
};

export const Task = () => {
  const { taskId } = useParams<TaskParams>() as Required<TaskParams>;

  const layoutSetsConfig = useStore(layoutStore, (state) => state.layoutSetsConfig);

  const pageOrder = useStore(layoutStore, (state) => state.pageOrder);

  const setPageOrder = useStore(layoutStore, (state) => state.setPageOrder);
  const setLayouts = useStore(layoutStore, (state) => state.setLayouts);

  const layouts = useStore(layoutStore, (state) => state.layouts);

  const apiClient = useApiClient();
  const [isLoading, setIsLoading] = useState(true);

  const currentLayoutSet = layoutSetsConfig?.sets.find((layoutSet) => layoutSet.tasks.includes(taskId));

  useEffect(() => {
    async function getLayoutDetails(layoutSetId: string) {
      const res = await apiClient.org.layoutsAllSettingsDetail(layoutSetId, ORG, APP);
      const data = await res.json();
      const settings = JSON.parse(data.settings);
      const layoutsJson = JSON.parse(data.layouts);

      setPageOrder(settings);
      setLayouts(layoutsJson);
      setIsLoading(false);
    }

    if (currentLayoutSet?.id) {
      void getLayoutDetails(currentLayoutSet.id);
    }
  }, [apiClient.org, currentLayoutSet?.id, setLayouts, setPageOrder]);

  if (!currentLayoutSet) {
    throw new Error('Layoutset for task not found');
  }

  if (isLoading) {
    return <h1>Loading</h1>;
  }

  if (!pageOrder || !pageOrder.pages?.order?.length) {
    return <h1>No pages found in pageOrder</h1>;
  }

  if (!layouts) {
    return <h1>No layouts loaded</h1>;
  }

  return (
    <div>
      <Navigate to={`${pageOrder.pages.order[0]}`} />
      <Outlet />
    </div>
  );
};
