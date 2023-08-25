import React from 'react';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useCanSubmitForm } from 'src/hooks/useCanSubmitForm';
import { useLanguage } from 'src/hooks/useLanguage';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { HComponent } from 'src/utils/layout/hierarchy.types';

export type IButtonReceivedProps = PropsFromGenericComponent<'Button'>;
export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & HComponent<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & HComponent<'InstantiationButton'>);

export const ButtonComponent = ({ node, ...componentProps }: IButtonReceivedProps) => {
  const { id, mode } = node.item;
  const { lang } = useLanguage();
  const props: IButtonProvidedProps = { ...componentProps, ...node.item, node };

  const dispatch = useAppDispatch();
  const currentTaskType = useAppSelector((state) => state.instanceData.instance?.process?.currentTask?.altinnTaskType);
  const processActionsFeature = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.features?.processActions,
  );
  const { actions, write } = useAppSelector((state) => state.process);
  const { canSubmit, busyWithId, message } = useCanSubmitForm();

  const disabled =
    !canSubmit ||
    (processActionsFeature &&
      ((currentTaskType === 'data' && !write) || (currentTaskType === 'confirmation' && !actions?.confirm)));

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

  const submitTask = ({ componentId }: { componentId: string }) => {
    if (!disabled) {
      const { org, app, instanceId } = window;
      if (currentTaskType === 'data') {
        dispatch(
          FormDataActions.submit({
            url: `${window.location.origin}/${org}/${app}/api/${instanceId}`,
            componentId,
          }),
        );
      } else if (currentTaskType === 'confirmation' && processActionsFeature) {
        dispatch(ProcessActions.complete({ componentId, action: 'confirm' }));
      } else {
        dispatch(ProcessActions.complete({ componentId }));
      }
    }
  };
  return (
    <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
      <SubmitButton
        onClick={() => submitTask({ componentId: id })}
        id={id}
        busyWithId={busyWithId}
        disabled={disabled}
        message={message}
      >
        {lang(node.item.textResourceBindings?.title)}
      </SubmitButton>
    </div>
  );
};
