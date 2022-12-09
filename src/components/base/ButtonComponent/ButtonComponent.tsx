import React from 'react';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import css from 'src/components/base/ButtonComponent/ButtonComponent.module.css';
import { getComponentFromMode } from 'src/components/base/ButtonComponent/getComponentFromMode';
import { SaveButton } from 'src/components/base/ButtonComponent/SaveButton';
import { SubmitButton } from 'src/components/base/ButtonComponent/SubmitButton';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import type { IComponentProps } from 'src/components';
import type { ButtonMode } from 'src/components/base/ButtonComponent/getComponentFromMode';
import type { ILayoutCompButton } from 'src/features/form/layout';
import type { IAltinnWindow } from 'src/types';

import { getLanguageFromKey } from 'src/utils/sharedUtils';

export interface IButtonProvidedProps extends IComponentProps, ILayoutCompButton {
  disabled: boolean;
  id: string;
  mode?: ButtonMode;
  taskId?: string;
}

export const ButtonComponent = ({ mode, ...props }: IButtonProvidedProps) => {
  const dispatch = useAppDispatch();
  const autoSave = useAppSelector((state) => state.formLayout.uiConfig.autoSave);
  const submittingId = useAppSelector((state) => state.formData.submittingId);
  const savingId = useAppSelector((state) => state.formData.savingId);
  const ignoreWarnings = useAppSelector((state) => state.formData.ignoreWarnings);
  const currentTaskType = useAppSelector((state) => state.instanceData.instance?.process.currentTask?.altinnTaskType);
  if (mode && !(mode === 'save' || mode === 'submit')) {
    const GenericButton = getComponentFromMode(mode);
    return (
      <div className='container pl-0'>
        <div className={css['button-group']}>
          <div className={css['button-row']}>
            <GenericButton {...props}>{props.text}</GenericButton>
          </div>
        </div>
      </div>
    );
  }

  const saveFormData = () => {
    dispatch(FormDataActions.submit({ componentId: 'saveBtn' }));
  };

  const submitTask = ({ componentId }: { componentId: string }) => {
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    if (currentTaskType === 'data') {
      dispatch(
        FormDataActions.submit({
          url: `${window.location.origin}/${org}/${app}/api/${instanceId}`,
          apiMode: 'Complete',
          stopWithWarnings: !ignoreWarnings,
          componentId,
        }),
      );
    } else {
      dispatch(ProcessActions.complete());
    }
  };
  const busyWithId = savingId || submittingId || '';
  return (
    <div className='container pl-0'>
      <div className={css['button-group']}>
        <div className={css['button-row']}>
          {autoSave === false && ( // can this be removed from the component?
            <SaveButton
              onClick={saveFormData}
              id='saveBtn'
              busyWithId={busyWithId}
              language={props.language}
            >
              {getLanguageFromKey('general.save', props.language)}
            </SaveButton>
          )}
          <SubmitButton
            onClick={() => submitTask({ componentId: props.id })}
            id={props.id}
            language={props.language}
            busyWithId={busyWithId}
          >
            {props.text}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
};
