import React from 'react';

import { ButtonLayout } from '@app/form-component';
import type { ValidLanguageKey } from '@app/language';

import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import { FormStore } from 'src/features/form/FormContext';
import { getUiConfig } from 'src/features/form/ui';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useIsSubformPage } from 'src/hooks/navigation';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { ProcessTaskType } from 'src/types';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { AttachmentState } from 'src/features/attachments/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';

const PENDING_STATUS_MESSAGES: Partial<Record<AttachmentState, ValidLanguageKey>> = {
  Pending: 'general.wait_for_attachments_scanning',
  uploading: 'general.wait_for_attachments',
};

export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & CompInternal<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & CompInternal<'InstantiationButton'>);

export const ButtonComponent = ({ baseComponentId, ...componentProps }: PropsFromGenericComponent<'Button'>) => {
  const item = useItemWhenType(baseComponentId, 'Button');
  const mode = item.type === 'Button' ? item.mode : undefined;
  const { innerGrid } = useComponentStructureData(baseComponentId);
  const props: IButtonProvidedProps = { baseComponentId, ...componentProps, ...item };

  const currentTaskType = useTaskTypeFromBackend();
  const { data: process } = useProcessQuery();
  const currentTask = process?.currentTask;
  const { actions, write } = currentTask ?? {};
  const attachmentState = AttachmentReadModel.useAttachmentState();
  const { mutate: processNext, isPending: isProcessingNext } = useProcessNext();
  const { mutate: processConfirm, isPending: isConfirming } = useProcessNext({ action: 'confirm' });

  const setReturnToView = FormStore.pageNavigation.useSetReturnToView();

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
    const uiFolders = getUiConfig().folders;

    setReturnToView?.(undefined);
    if (currentTaskType === ProcessTaskType.Data || (currentTask?.elementId && currentTask?.elementId in uiFolders)) {
      processNext();
    } else if (currentTaskType === ProcessTaskType.Confirm) {
      processConfirm();
    }
  }

  const disabled =
    attachmentState.hasPending ||
    (currentTaskType === ProcessTaskType.Data && !write) ||
    (currentTaskType === ProcessTaskType.Confirm && !actions?.confirm);

  const statusMessage = attachmentState.hasPending ? PENDING_STATUS_MESSAGES[attachmentState.state] : undefined;

  return (
    <ButtonLayout
      componentId={item.id}
      title={item.textResourceBindings?.title}
      size={item.size}
      fullWidth={item.fullWidth}
      textAlign={item.textAlign}
      position={item.position}
      disabled={disabled}
      isLoading={isProcessingNext || isConfirming}
      onClick={submitTask}
      statusMessage={statusMessage}
      innerGrid={innerGrid}
    />
  );
};
