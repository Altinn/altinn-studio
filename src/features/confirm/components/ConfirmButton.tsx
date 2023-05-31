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
  const confirmingId = useAppSelector((state) => state.process.completingId);
  const [validateId, setValidateId] = useState<string | null>(null);
  const processActionsFeature = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata?.features?.processActions,
  );
  const { actions } = useAppSelector((state) => state.process);
  const disabled = processActionsFeature && !actions?.confirm;

  const dispatch = useAppDispatch();
  const { instanceId } = window as Window as IAltinnWindow;

  const handleConfirmClick = () => {
    if (!disabled) {
      setValidateId(props.id);
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
              dispatch(ProcessActions.complete({ componentId: props.id, action: 'confirm' }));
            } else {
              dispatch(ProcessActions.complete({ componentId: props.id }));
            }
          }
        })
        .catch((error) => {
          dispatch(ProcessActions.completeRejected({ error: JSON.parse(JSON.stringify(error)) }));
        })
        .finally(() => {
          setValidateId(null);
        });
    }
  };

  const busyWithId = confirmingId || validateId || null;

  return (
    <div style={{ marginTop: 'var(--button-margin-top)' }}>
      <SubmitButton
        {...props}
        busyWithId={busyWithId}
        onClick={handleConfirmClick}
        disabled={disabled}
      >
        {getTextFromAppOrDefault('confirm.button_text', textResources, props.language)}
      </SubmitButton>
    </div>
  );
};
