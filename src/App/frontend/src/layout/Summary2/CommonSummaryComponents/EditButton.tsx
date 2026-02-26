import React from 'react';

import { PencilIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useSetReturnToView, useSetSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useCurrentView, useNavigateToComponent } from 'src/hooks/useNavigatePage';
import { useIsEditableInRepGroup } from 'src/layout/RepeatingGroup/Summary2/RepGroupSummaryEditableContext';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden, useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useItemFor } from 'src/utils/layout/useNodeItem';

export type EditButtonProps = {
  targetBaseComponentId: string;
  navigationOverride?: (() => Promise<void> | void) | null;
  skipLastIdMutator?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

/**
 * Render an edit button for the first visible (non-hidden) and editable component in a list of possible IDs
 */
export function EditButtonFirstVisibleAndEditable({
  ids,
  fallback,
  ...rest
}: { ids: string[]; fallback: string | undefined } & Omit<EditButtonProps, 'targetBaseComponentId'>) {
  const hiddenIds = useIsHiddenMulti(ids);
  const first = ids.find((id) => hiddenIds[id] === false);
  const isFallbackHidden = useIsHidden(fallback);
  const target = first ?? (isFallbackHidden ? undefined : fallback);

  if (!target) {
    return null;
  }

  return (
    <EditButton
      targetBaseComponentId={target}
      skipLastIdMutator={target === fallback}
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
  const navigateToComponent = useNavigateToComponent();
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

  const overrides = useTaskOverrides();
  const overriddenTaskId = overrides?.taskId;
  const overriddenDataElementId = overrides?.dataModelElementId;
  const indexedId = useIndexedId(targetBaseComponentId, skipLastIdMutator);
  const summary2Id = useSummaryProp('id');

  // Check if we're in a repeating group row and if this component is editable
  const editableInRepGroup = useIsEditableInRepGroup(targetBaseComponentId);
  if (!editableInRepGroup) {
    return null;
  }

  if (isReadOnly) {
    return null;
  }

  if (overriddenDataElementId) {
    return null;
  }

  if (pdfModeActive || overriddenTaskId?.length) {
    return null;
  }

  const onChangeClick = async () => {
    if (navigationOverride) {
      await navigationOverride();
    } else {
      await navigateToComponent(indexedId, targetBaseComponentId, {
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
      data-target-id={indexedId}
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
