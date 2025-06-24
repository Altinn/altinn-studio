import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useAttachmentState, useHasPendingAttachments } from 'src/features/attachments/hooks';
import { useSetReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useLaxProcessData, useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsSubformPage } from 'src/features/routing/AppRoutingContext';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { alignStyle } from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer';
import { ProcessTaskType } from 'src/types';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';

export type IButtonReceivedProps = PropsFromGenericComponent<'Button'>;
export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & CompInternal<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & CompInternal<'InstantiationButton'>);

export const ButtonComponent = ({ node, ...componentProps }: IButtonReceivedProps) => {
  const item = useNodeItem(node);
  const { mode } = item;
  const { langAsString } = useLanguage();
  const props: IButtonProvidedProps = { ...componentProps, ...item, node };

  const currentTaskType = useTaskTypeFromBackend();
  const { actions, write } = useLaxProcessData()?.currentTask || {};
  const attachmentsPending = useHasPendingAttachments();
  const attachmentState = useAttachmentState();
  const processNext = useProcessNext();
  const { performProcess, isAnyProcessing, isThisProcessing } = useIsProcessing();
  const setReturnToView = useSetReturnToView();

  if (useIsSubformPage()) {
    throw new Error('Cannot use process navigation in a subform');
  }

  const disabled =
    isAnyProcessing ||
    attachmentsPending ||
    attachmentState.state === 'Infected' ||
    (currentTaskType === ProcessTaskType.Data && !write) ||
    (currentTaskType === ProcessTaskType.Confirm && !actions?.confirm);

  if (mode && !(mode === 'save' || mode === 'submit')) {
    const GenericButton = getComponentFromMode(mode);
    if (!GenericButton) {
      return null;
    }

    return (
      <GenericButton {...props}>
        <Lang id={item.textResourceBindings?.title} />
      </GenericButton>
    );
  }

  const submitTask = () =>
    performProcess(async () => {
      setReturnToView?.(undefined);
      if (currentTaskType === ProcessTaskType.Data) {
        await processNext();
      } else if (currentTaskType === ProcessTaskType.Confirm) {
        await processNext({ action: 'confirm' });
      }
    });

  return (
    <ComponentStructureWrapper node={node}>
      <Button
        style={item?.position ? { ...alignStyle(item?.position) } : {}}
        textAlign={item.textAlign}
        size={item.size}
        fullWidth={item.fullWidth}
        id={node.id}
        onClick={submitTask}
        isLoading={isThisProcessing}
        disabled={disabled}
        color='success'
      >
        <Lang id={item.textResourceBindings?.title} />
      </Button>
      {attachmentState.hasPending && attachmentState.state !== 'Infected' && (
        <span style={{ position: 'absolute' }}>
          {attachmentState.state === 'Pending' && langAsString('general.wait_for_attachments_scanning')}
          {attachmentState.state === 'uploading' && langAsString('general.wait_for_attachments')}
        </span>
      )}
    </ComponentStructureWrapper>
  );
};
