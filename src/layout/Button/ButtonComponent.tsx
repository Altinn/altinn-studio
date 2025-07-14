import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { useAttachmentState } from 'src/features/attachments/hooks';
import { useSetReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsSubformPage } from 'src/features/routing/AppRoutingContext';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { alignStyle } from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer';
import { ProcessTaskType } from 'src/types';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';

export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & CompInternal<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & CompInternal<'InstantiationButton'>);

export const ButtonComponent = ({ baseComponentId, ...componentProps }: PropsFromGenericComponent<'Button'>) => {
  const item = useItemWhenType(baseComponentId, 'Button');
  const mode = item.type === 'Button' ? item.mode : undefined;
  const { langAsString } = useLanguage();
  const props: IButtonProvidedProps = { baseComponentId, ...componentProps, ...item };

  const currentTaskType = useTaskTypeFromBackend();
  const { actions, write } = useProcessQuery().data?.currentTask || {};
  const attachmentState = useAttachmentState();
  const { mutate: processNext, isPending: isProcessingNext } = useProcessNext();
  const { mutate: processConfirm, isPending: isConfirming } = useProcessNext({ action: 'confirm' });

  const setReturnToView = useSetReturnToView();

  if (useIsSubformPage()) {
    throw new Error('Cannot use process navigation in a subform');
  }

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

  function submitTask() {
    setReturnToView?.(undefined);
    if (currentTaskType === ProcessTaskType.Data) {
      processNext();
    } else if (currentTaskType === ProcessTaskType.Confirm) {
      processConfirm();
    }
  }

  const disabled =
    attachmentState.hasPending ||
    attachmentState.state === 'Infected' ||
    (currentTaskType === ProcessTaskType.Data && !write) ||
    (currentTaskType === ProcessTaskType.Confirm && !actions?.confirm);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Button
        style={item?.position ? { ...alignStyle(item?.position) } : {}}
        textAlign={item.textAlign}
        size={item.size}
        fullWidth={item.fullWidth}
        id={item.id}
        onClick={submitTask}
        isLoading={isProcessingNext || isConfirming}
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
