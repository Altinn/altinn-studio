import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Edit } from '@navikt/ds-icons';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { NavigationResult } from 'src/features/form/layout/NavigateToNode';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type EditButtonProps = {
  componentNode: LayoutNode;
  summaryComponentId: string;
  navigationOverride?: (() => Promise<NavigationResult> | void) | null;
} & React.HTMLAttributes<HTMLButtonElement>;

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

  const titleTrb = useNodeItem(componentNode, (i) =>
    i.textResourceBindings && 'title' in i.textResourceBindings ? i.textResourceBindings.title : undefined,
  );
  const accessibleTitle = titleTrb ? langAsString(titleTrb) : '';

  const { overriddenTaskId, overriddenDataModelUuid } = useTaskStore(
    ({ overriddenTaskId, overriddenDataModelUuid }) => ({
      overriddenTaskId,
      overriddenDataModelUuid,
    }),
  );

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
      onClick={onChangeClick}
      variant='tertiary'
      size='small'
      className={className}
    >
      {!isMobile && <Lang id={'general.edit'} />}
      <Edit
        fontSize='1rem'
        aria-hidden={true}
        title={`${isMobile ? langAsString('form_filler.summary_item_change') : ''} ${accessibleTitle}`}
      />
    </Button>
  );
}
