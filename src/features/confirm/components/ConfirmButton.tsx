import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { get } from 'src/utils/network/networking';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { getValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapDataElementValidationToRedux } from 'src/utils/validation';
import type { BaseButtonProps } from 'src/layout/Button/WrappedButton';
import type { IAltinnWindow } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export const ConfirmButton = (props: Omit<BaseButtonProps, 'onClick'> & { id: string; language: ILanguage }) => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const dispatch = useAppDispatch();
  const { instanceId } = window as Window as IAltinnWindow;
  const [busyWithId, setBusyWithId] = useState('');
  const handleConfirmClick = () => {
    setBusyWithId(props.id);
    get(getValidationUrl(instanceId))
      .then((data: any) => {
        const mappedValidations = mapDataElementValidationToRedux(data, {}, textResources);
        dispatch(
          ValidationActions.updateValidations({
            validations: mappedValidations,
          }),
        );
        if (data.length === 0) {
          dispatch(
            ProcessActions.complete({
              taskId: '',
              processStep: ProcessTaskType.Unknown,
            }),
          );
        }
      })
      .finally(() => {
        setBusyWithId('');
      });
  };
  return (
    <SubmitButton
      {...props}
      busyWithId={busyWithId}
      onClick={handleConfirmClick}
    >
      {getTextFromAppOrDefault('confirm.button_text', textResources, props.language)}
    </SubmitButton>
  );
};
