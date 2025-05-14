import React from 'react';

import { ComponentSummaryById } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { Hidden, NodesInternal, useGetPage } from 'src/utils/layout/NodesContext';

interface PageSummaryProps {
  pageId: string;
}

export function PageSummary({ pageId }: PageSummaryProps) {
  const page = useGetPage(pageId);
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((nodeData) => nodeData.pageKey === pageId && nodeData.parentId === undefined) // Find top-level nodes
      .map((nodeData) => nodeData.layout.id),
  );
  const isHiddenPage = Hidden.useIsHiddenPage(page);

  if (!page || !children) {
    throw new Error('PageId invalid in PageSummary.');
  }

  if (isHiddenPage) {
    return null;
  }

  return children?.map((nodeId) => (
    <ComponentSummaryById
      key={nodeId}
      componentId={nodeId}
    />
  ));
}
