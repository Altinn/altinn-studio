import React from 'react';

import { PencilIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useNavigateTo } from 'src/features/form/layout/NavigateToNode';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PDFWrapper';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { NavigationResult } from 'src/features/form/layout/NavigateToNode';

export type EditButtonProps = {
  targetBaseComponentId: string;
  navigationOverride?: (() => Promise<NavigationResult> | void) | null;
  skipLastIdMutator?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

/**
 * Render an edit button for the first visible (non-hidden) node in a list of possible IDs
 */
export function EditButtonFirstVisible({
  ids,
  fallback,
  ...rest
}: { ids: string[]; fallback: string } & Omit<EditButtonProps, 'targetBaseComponentId'>) {
  const first = Hidden.useFirstVisibleBaseId(ids);
  const indexedFallbackId = useIndexedId(fallback, true);
  const isFallbackHidden = Hidden.useIsHidden(indexedFallbackId);
  if (!first && isFallbackHidden) {
    return null;
  }

  return (
    <EditButton
      targetBaseComponentId={first ?? fallback}
      skipLastIdMutator={!first}
      {...rest}
    />
  );
}

export function EditButton({
  targetBaseComponentId,
  className,
  navigationOverride = null,
  skipLastIdMutator,
}: EditButtonProps) {
  const navigateTo = useNavigateTo();
  const { langAsString } = useLanguage();
  const setReturnToView = useSetReturnToView();
  const setNodeOfOrigin = useSetSummaryNodeOfOrigin();
  const currentPageId = useCurrentView();
  const pdfModeActive = usePdfModeActive();
  const isMobile = useIsMobile();

  const componentConfig = useItemFor(targetBaseComponentId);
  const { textResourceBindings } = componentConfig;

  const isReadOnly = 'readOnly' in componentConfig && componentConfig.readOnly === true;
  const titleTrb = textResourceBindings && 'title' in textResourceBindings ? textResourceBindings.title : undefined;
  const accessibleTitle = titleTrb ? langAsString(titleTrb) : '';

  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);
  const overriddenDataModelUuid = useTaskStore((state) => state.overriddenDataModelUuid);
  const indexedId = useIndexedId(targetBaseComponentId, skipLastIdMutator);
  const summary2Id = useSummaryProp('id');

  if (isReadOnly) {
    return null;
  }

  if (overriddenDataModelUuid) {
    return null;
  }

  if (pdfModeActive || (overriddenTaskId && overriddenTaskId?.length > 0)) {
    return null;
  }

  const onChangeClick = async () => {
    if (navigationOverride) {
      await navigationOverride();
    } else {
      await navigateTo(indexedId, targetBaseComponentId, {
        shouldFocus: true,
        pageNavOptions: {
          resetReturnToView: false,
        },
      });
    }

    setReturnToView?.(currentPageId);
    setNodeOfOrigin?.(summary2Id);
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
