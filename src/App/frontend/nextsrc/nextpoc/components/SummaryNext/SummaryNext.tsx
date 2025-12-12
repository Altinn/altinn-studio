import React from 'react';
import type { FunctionComponent } from 'react';

import { RenderComponent } from 'nextsrc/nextpoc/components/RenderComponent';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { useStore } from 'zustand';
import type { RenderComponentType } from 'nextsrc/nextpoc/components/RenderComponent';

import type { CompIntermediateExact } from 'src/layout/layout';

interface LayoutSetSummaryNextType {
  pageKey?: string;
}

const LayoutSetSummaryNext: React.FunctionComponent<LayoutSetSummaryNextType> = () => {
  const layoutSet = useStore(layoutStore, (state) => state.layouts);

  return <pre>{JSON.stringify(layoutSet, null, 2)}</pre>;
};

interface ComponentSummaryNextType {
  componentId: string;
}

const ComponentSummaryNext: React.FunctionComponent<ComponentSummaryNextType> = ({ componentId }) => {
  const summaryComponent = useStore(layoutStore, (state) => {
    if (!state.componentMap) {
      throw new Error('no component map');
    }

    return state.componentMap[componentId];
  });

  return (
    <RenderComponent
      component={summaryComponent}
      renderAsSummary={true}
    />
  );
};

interface SummaryNextProps extends RenderComponentType {
  summaryComponent: CompIntermediateExact<'Summary2'>;
}

export const SummaryNext: FunctionComponent<SummaryNextProps> = ({ summaryComponent }) => {
  const { target } = summaryComponent;

  if (!target) {
    return <LayoutSetSummaryNext />;
  }

  if (target.type === 'layoutSet') {
    return <LayoutSetSummaryNext />;
  }

  if (target.type === 'page') {
    return <LayoutSetSummaryNext pageKey={target.id} />;
  }

  return <ComponentSummaryNext componentId={target.id} />;
};
