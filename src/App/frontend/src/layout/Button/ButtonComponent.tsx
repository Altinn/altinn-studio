import React from 'react';

import { ButtonLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { ValidLanguageKey } from '@app/language';

import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import { FormStore } from 'src/features/form/FormContext';
import { getUiConfig } from 'src/features/form/ui';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useIsSubformPage } from 'src/hooks/navigation';
import { ProcessTaskType } from 'src/types';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { AttachmentState } from 'src/features/attachments/types';
import type { PropsFromGenericComponent } from 'src/layout';

const PENDING_STATUS_MESSAGES: Partial<Record<AttachmentState, ValidLanguageKey>> = {
  Pending: 'general.wait_for_attachments_scanning',
  uploading: 'general.wait_for_attachments',
};

export const ButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'Button'>) => {
  const config = useComponentConfig(baseComponentId, 'Button');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Button.textResourceBindings.title);
  const { innerGrid } = useComponentStructureData(baseComponentId);
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
      componentId={componentId}
      title={title}
      size={config.size}
      fullWidth={config.fullWidth}
      textAlign={config.textAlign}
      position={config.position}
      disabled={disabled}
      isLoading={isProcessingNext || isConfirming}
      onClick={submitTask}
      statusMessage={statusMessage}
      innerGrid={innerGrid}
    />
  );
};
