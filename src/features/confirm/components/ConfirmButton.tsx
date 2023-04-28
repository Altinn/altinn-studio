import React, { useState } from 'react';

import { ProcessActions } from 'src/features/process/processSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { httpGet } from 'src/utils/network/networking';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { getValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapDataElementValidationToRedux } from 'src/utils/validation/validation';
import type { BaseButtonProps } from 'src/layout/Button/WrappedButton';
import type { IAltinnWindow } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export const ConfirmButton = (props: Omit<BaseButtonProps, 'onClick'> & { id: string; language: ILanguage }) => {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const processActionsFeature = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.features?.processActions,
  );
  const { actions } = useAppSelector((state) => state.process);
  const disabled = processActionsFeature && !actions?.confirm;

  const dispatch = useAppDispatch();
  const { instanceId } = window as Window as IAltinnWindow;
  const [busyWithId, setBusyWithId] = useState('');

  const handleConfirmClick = () => {
    if (!disabled) {
      setBusyWithId(props.id);
      httpGet(getValidationUrl(instanceId))
        .then((data: any) => {
          const mappedValidations = mapDataElementValidationToRedux(data, {}, textResources);
          dispatch(
            ValidationActions.updateValidations({
              validations: mappedValidations,
            }),
          );
          if (data.length === 0) {
            if (processActionsFeature) {
              dispatch(ProcessActions.complete({ action: 'confirm' }));
            } else {
              dispatch(ProcessActions.complete());
            }
          }
        })
        .finally(() => {
          setBusyWithId('');
        });
    }
  };

  return (
    <SubmitButton
      {...props}
      busyWithId={busyWithId}
      onClick={handleConfirmClick}
      disabled={disabled}
    >
      {getTextFromAppOrDefault('confirm.button_text', textResources, props.language)}
    </SubmitButton>
  );
};
