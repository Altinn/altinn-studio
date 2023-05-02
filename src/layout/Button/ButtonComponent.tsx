import React from 'react';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/Button/ButtonComponent.module.css';
import { getComponentFromMode } from 'src/layout/Button/getComponentFromMode';
import { SaveButton } from 'src/layout/Button/SaveButton';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAltinnWindow } from 'src/types';
import type { HComponent } from 'src/utils/layout/hierarchy.types';

export type IButtonReceivedProps = PropsFromGenericComponent<'Button'>;
export type IButtonProvidedProps =
  | (PropsFromGenericComponent<'Button'> & HComponent<'Button'>)
  | (PropsFromGenericComponent<'InstantiationButton'> & HComponent<'InstantiationButton'>);

export const ButtonComponent = ({ node, ...componentProps }: IButtonReceivedProps) => {
  const { id, mode } = node.item;
  const props: IButtonProvidedProps = { ...componentProps, ...node.item, node };

  const dispatch = useAppDispatch();
  const autoSave = useAppSelector((state) => state.formLayout.uiConfig.autoSave);
  const submittingId = useAppSelector((state) => state.formData.submittingId);
  const savingId = useAppSelector((state) => state.formData.savingId);
  const currentTaskType = useAppSelector((state) => state.instanceData.instance?.process.currentTask?.altinnTaskType);
  const processActionsFeature = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.features?.processActions,
  );
  const { actions, write } = useAppSelector((state) => state.process);

  const disabled =
    processActionsFeature &&
    ((currentTaskType === 'data' && !write) || (currentTaskType === 'confirmation' && !actions?.confirm));

  const parentIsPage = node.parent instanceof LayoutPage;

  if (mode && !(mode === 'save' || mode === 'submit')) {
    const GenericButton = getComponentFromMode(mode);
    if (!GenericButton) {
      return null;
    }

    return (
      <div
        className={classes.container}
        style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
      >
        <GenericButton {...props}>{props.text}</GenericButton>
      </div>
    );
  }
  const saveFormData = () => {
    dispatch(FormDataActions.submit({ componentId: 'saveBtn' }));
  };

  const submitTask = ({ componentId }: { componentId: string }) => {
    if (!disabled) {
      const { org, app, instanceId } = window as Window as IAltinnWindow;
      if (currentTaskType === 'data') {
        dispatch(
          FormDataActions.submit({
            url: `${window.location.origin}/${org}/${app}/api/${instanceId}`,
            apiMode: 'Complete',
            stopWithWarnings: false,
            componentId,
          }),
        );
      } else if (currentTaskType === 'confirmation' && processActionsFeature) {
        dispatch(ProcessActions.complete({ action: 'confirm' }));
      } else {
        dispatch(ProcessActions.complete());
      }
    }
  };
  const busyWithId = savingId || submittingId || '';
  return (
    <div
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      {autoSave === false && ( // can this be removed from the component?
        <SaveButton
          onClick={saveFormData}
          id='saveBtn'
          busyWithId={busyWithId}
          language={props.language}
          disabled={disabled}
        >
          {getLanguageFromKey('general.save', props.language)}
        </SaveButton>
      )}
      <SubmitButton
        onClick={() => submitTask({ componentId: id })}
        id={id}
        language={props.language}
        busyWithId={busyWithId}
        disabled={disabled}
      >
        {props.text}
      </SubmitButton>
    </div>
  );
};
