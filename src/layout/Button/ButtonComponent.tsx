import React from 'react';

import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal } from 'src/layout/layout';

export type IButtonReceivedProps = PropsFromGenericComponent<'Button'>;
export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & CompInternal<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & CompInternal<'InstantiationButton'>);

export const ButtonComponent = ({ node, ...componentProps }: IButtonReceivedProps) => {
  const { mode } = node.item;
  const { lang, langAsString } = useLanguage();
  const props: IButtonProvidedProps = { ...componentProps, ...node.item, node };

  const currentTaskType = useLaxProcessData()?.currentTask?.altinnTaskType;
  const { actions, write } = useLaxProcessData()?.currentTask || {};
  const { next, canSubmit, busyWithId, attachmentsPending } = useProcessNavigation() || {};

  const disabled =
    !canSubmit || (currentTaskType === 'data' && !write) || (currentTaskType === 'confirmation' && !actions?.confirm);

  const parentIsPage = node.parent instanceof LayoutPage;

  if (mode && !(mode === 'save' || mode === 'submit')) {
    const GenericButton = getComponentFromMode(mode);
    if (!GenericButton) {
      return null;
    }

    return (
      <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
        <GenericButton {...props}>{lang(node.item.textResourceBindings?.title)}</GenericButton>
      </div>
    );
  }

  const submitTask = () => {
    if (!disabled && next) {
      if (currentTaskType === 'data') {
        next({ nodeId: node.item.id });
      } else if (currentTaskType === 'confirmation') {
        next({ nodeId: node.item.id, action: 'confirm' });
      }
    }
  };
  return (
    <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
      <SubmitButton
        nodeId={node.item.id}
        onClick={() => submitTask()}
        busyWithId={busyWithId}
        disabled={disabled}
        message={attachmentsPending ? langAsString('general.wait_for_attachments') : undefined}
      >
        {lang(node.item.textResourceBindings?.title)}
      </SubmitButton>
    </div>
  );
};
