import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { useSetReturnToView } from 'src/features/form/layout/PageNavigationContext';
import { useLaxProcessData, useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { ProcessTaskType } from 'src/types';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
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
          <Lang id={item.textResourceBindings?.title} />
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
      next({ nodeId: node.id });
    } else if (currentTaskType === ProcessTaskType.Confirm) {
      next({ nodeId: node.id, action: 'confirm' });
    }
  };
  return (
    <ComponentStructureWrapper node={node}>
      <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
        <Button
          id={node.id}
          onClick={submitTask}
          isLoading={busyWithId === node.id}
          disabled={disabled || !!busyWithId}
          color='success'
        >
          <Lang id={item.textResourceBindings?.title} />
        </Button>
        {attachmentsPending && (
          <span style={{ position: 'absolute' }}>{langAsString('general.wait_for_attachments')}</span>
        )}
      </div>
    </ComponentStructureWrapper>
  );
};
