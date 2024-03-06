import React from 'react';

import { useSetReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useLaxProcessData, useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { ProcessTaskType } from 'src/types';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';

export type IButtonReceivedProps = PropsFromGenericComponent<'Button'>;
export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & CompInternal<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & CompInternal<'InstantiationButton'>);

export const ButtonComponent = ({ node, ...componentProps }: IButtonReceivedProps) => {
  const { mode } = node.item;
  const { langAsString } = useLanguage();
  const props: IButtonProvidedProps = { ...componentProps, ...node.item, node };

  const currentTaskType = useTaskTypeFromBackend();
  const { actions, write } = useLaxProcessData()?.currentTask || {};
  const { next, canSubmit, busyWithId, attachmentsPending } = useProcessNavigation() || {};
  const setReturnToView = useSetReturnToView();

  const disabled =
    !canSubmit ||
    !next ||
    (currentTaskType === ProcessTaskType.Data && !write) ||
    (currentTaskType === ProcessTaskType.Confirm && !actions?.confirm);

  const parentIsPage = node.parent instanceof LayoutPage;

  if (mode && !(mode === 'save' || mode === 'submit')) {
    const GenericButton = getComponentFromMode(mode);
    if (!GenericButton) {
      return null;
    }

    return (
      <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
        <GenericButton {...props}>
          <Lang id={node.item.textResourceBindings?.title} />
        </GenericButton>
      </div>
    );
  }

  const submitTask = async () => {
    if (disabled) {
      return;
    }
    setReturnToView?.(undefined);
    if (currentTaskType === ProcessTaskType.Data) {
      next({ nodeId: node.item.id });
    } else if (currentTaskType === ProcessTaskType.Confirm) {
      next({ nodeId: node.item.id, action: 'confirm' });
    }
  };
  return (
    <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
      <SubmitButton
        nodeId={node.item.id}
        onClick={submitTask}
        busyWithId={busyWithId}
        disabled={disabled}
        message={attachmentsPending ? langAsString('general.wait_for_attachments') : undefined}
      >
        <Lang id={node.item.textResourceBindings?.title} />
      </SubmitButton>
    </div>
  );
};
