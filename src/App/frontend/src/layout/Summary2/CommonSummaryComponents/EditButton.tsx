import React from 'react';

import { Button, useIsMobile } from '@app/form-component';
import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import { PencilIcon } from '@navikt/aksel-icons';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import { useCurrentView, useNavigateToComponent } from 'src/hooks/useNavigatePage';
import { useIsEditableInRepGroup } from 'src/layout/RepeatingGroup/Summary2/RepGroupSummaryEditableContext';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

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
  const [target, ...remaining] = ids;
  if (!target) {
    return (
      <FallbackEditButton
        fallback={fallback}
        {...rest}
      />
    );
  }
  return (
    <CandidateEditButton
      targetBaseComponentId={target}
      remaining={remaining}
      fallback={fallback}
      {...rest}
    />
  );
}

function CandidateEditButton({
  targetBaseComponentId,
  remaining,
  fallback,
  ...rest
}: EditButtonProps & { remaining: string[]; fallback: string | undefined }) {
  const config = useComponentConfig(targetBaseComponentId);
  const readOnly = useEvalExpression(
    'readOnly' in config ? config.readOnly : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const hidden = useIsHidden(targetBaseComponentId);
  if (hidden || readOnly) {
    return (
      <EditButtonFirstVisibleAndEditable
        ids={remaining}
        fallback={fallback}
        {...rest}
      />
    );
  }
  return (
    <EditButton
      targetBaseComponentId={targetBaseComponentId}
      {...rest}
    />
  );
}

function FallbackEditButton({
  fallback,
  ...rest
}: Omit<EditButtonProps, 'targetBaseComponentId'> & { fallback: string | undefined }) {
  const hidden = useIsHidden(fallback);
  return fallback && !hidden ? (
    <EditButton
      targetBaseComponentId={fallback}
      skipLastIdMutator
      {...rest}
    />
  ) : null;
}

export function EditButton({
  targetBaseComponentId,
  className,
  navigationOverride = null,
  skipLastIdMutator,
}: EditButtonProps) {
  const navigateToComponent = useNavigateToComponent();
  const { langAsString } = useLanguage();
  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();
  const setNodeOfOrigin = FormStore.pageNavigation.useSetSummaryNodeOfOrigin();
  const currentPageId = useCurrentView();
  const pdfModeActive = usePdfModeActive();
  const isMobile = useIsMobile();

  const config = useComponentConfig(targetBaseComponentId);
  const readOnly = useEvalExpression(
    'readOnly' in config ? config.readOnly : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const title = useEvalExpression(
    config.textResourceBindings && 'title' in config.textResourceBindings
      ? config.textResourceBindings.title
      : undefined,
    CommonExpressions.TRBLabel.title,
  );

  const isReadOnly = 'readOnly' in config && readOnly === true;
  const accessibleTitle = title ? langAsString(title) : '';

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
