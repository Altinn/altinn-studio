// src/next/loaders/taskLoader.ts
import type { LoaderFunctionArgs } from 'react-router-dom';

import { API_CLIENT, APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';

export async function taskLoader({ params }: LoaderFunctionArgs) {
  const taskId = params.taskId;
  if (!taskId) {
    throw new Error('Missing taskId param');
  }

  // We need the layoutSetsConfig from the store
  const lstate = layoutStore.getState();

  const { layoutSetsConfig } = lstate;

  if (!layoutSetsConfig) {
    throw new Error('No layoutSetsConfig in store');
  }

  // Identify the relevant layout set for the given taskId
  const currentLayoutSet = layoutSetsConfig.sets.find((layoutSet) => layoutSet.tasks.includes(taskId));

  if (!currentLayoutSet?.id) {
    throw new Error('Layoutset for task not found');
  }

  // Fetch the layout details
  const res = await API_CLIENT.org.layoutsettingsDetail(currentLayoutSet.id, ORG, APP);
  const data = await res.json();

  // Extract settings/layout JSON
  const settings = JSON.parse(data.settings);
  const layouts = JSON.parse(data.layouts);

  debugger;

  // Update the layout store
  layoutStore.getState().setPageOrder(settings);
  layoutStore.getState().setLayouts(layouts);

  // Return anything the <Task> component may want directly.
  return {
    currentLayoutSet,
    pageOrder: settings,
    layouts,
  };
}
