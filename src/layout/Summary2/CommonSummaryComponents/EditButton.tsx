import React from 'react';

import { PencilIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { NavigationResult } from 'src/features/form/layout/NavigateToNode';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type EditButtonProps = {
  componentNode: LayoutNode;
  summaryComponentId?: string;
  navigationOverride?: (() => Promise<NavigationResult> | void) | null;
} & React.HTMLAttributes<HTMLButtonElement>;

/**
 * Render an edit button for the first visible (non-hidden) node in a list of possible IDs
 */
export function EditButtonFirstVisible({ ids, ...rest }: { ids: string[] } & Omit<EditButtonProps, 'componentNode'>) {
  const nodeId = Hidden.useFirstVisibleNode(ids);
  const componentNode = useNode(nodeId);
  if (!componentNode) {
    return null;
  }

  return (
    <EditButton
      componentNode={componentNode}
      {...rest}
    />
  );
}

export function EditButton({
  componentNode,
  summaryComponentId,
  className,
  navigationOverride = null,
}: EditButtonProps) {
  const navigateTo = useNavigateToNode();
  const { langAsString } = useLanguage();
  const setReturnToView = useSetReturnToView();
  const setNodeOfOrigin = useSetSummaryNodeOfOrigin();
  const currentPageId = useCurrentView();
  const pdfModeActive = usePdfModeActive();
  const isMobile = useIsMobile();

  const { textResourceBindings } = useItemFor(componentNode.baseId);
  const titleTrb = textResourceBindings && 'title' in textResourceBindings ? textResourceBindings.title : undefined;
  const accessibleTitle = titleTrb ? langAsString(titleTrb) : '';

  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);
  const overriddenDataModelUuid = useTaskStore((state) => state.overriddenDataModelUuid);

  if (overriddenDataModelUuid) {
    return null;
  }

  if (pdfModeActive || (overriddenTaskId && overriddenTaskId?.length > 0)) {
    return null;
  }

  const onChangeClick = async () => {
    if (!componentNode.pageKey) {
      return;
    }

    if (navigationOverride) {
      await navigationOverride();
    } else {
      await navigateTo(componentNode, {
        shouldFocus: true,
        pageNavOptions: {
          resetReturnToView: false,
        },
      });
    }

    setReturnToView?.(currentPageId);
    setNodeOfOrigin?.(summaryComponentId);
  };
  return (
    <Button
      aria-label={isMobile ? langAsString('general.edit') : undefined}
      onClick={onChangeClick}
      variant='tertiary'
      className={className}
    >
      {!isMobile && <Lang id='general.edit' />}
      <PencilIcon
        aria-hidden
        fontSize='1rem'
        title={`${isMobile ? langAsString('form_filler.summary_item_change') : ''} ${accessibleTitle}`}
      />
    </Button>
  );
}
