import React from 'react';
import type { CSSProperties } from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { ComponentSummary, HideWhenAllChildrenEmpty } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverridesForPage, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { Hidden, useGetPage } from 'src/utils/layout/NodesContext';

interface PageSummaryProps {
  pageId: string;
}

const fullWidth: CSSProperties = { width: '100%' };

export function PageSummary({ pageId }: PageSummaryProps) {
  const page = useGetPage(pageId);
  const children = useLayoutLookups().topLevelComponents[pageId];
  const isHiddenPage = Hidden.useIsHiddenPage(page);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const overrides = useSummaryOverridesForPage(pageId);

  if (!page || !children) {
    throw new Error('PageId invalid in PageSummary.');
  }

  if (isHiddenPage || overrides?.hidden) {
    return null;
  }

  return (
    <HideWhenAllChildrenEmpty
      hideWhen={hideEmptyFields}
      render={(className) => (
        <Flex
          item
          style={fullWidth}
          className={className}
          data-summary-pagekey={pageId}
        >
          <Flex
            container
            spacing={6}
            alignItems='flex-start'
            data-summary-pagekey={pageId}
          >
            {children?.map((baseId) => (
              <ComponentSummary
                key={baseId}
                targetBaseComponentId={baseId}
              />
            ))}
          </Flex>
        </Flex>
      )}
    />
  );
}
