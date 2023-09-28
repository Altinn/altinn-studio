import React, { useState } from 'react';

import { ProcessActions } from 'src/features/process/processSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { SubmitButton } from 'src/layout/Button/SubmitButton';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { httpGet } from 'src/utils/network/networking';
import { getValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapValidationIssues } from 'src/utils/validation/backendValidation';
import { createValidationResult } from 'src/utils/validation/validationHelpers';
import type { BaseButtonProps } from 'src/layout/Button/WrappedButton';

export const ConfirmButton = (props: Omit<BaseButtonProps, 'onClick'> & { id: string }) => {
  const confirmingId = useAppSelector((state) => state.process.completingId);
  const [validateId, setValidateId] = useState<string | null>(null);
  const { actions } = useAppSelector((state) => state.process);
  const disabled = !actions?.confirm;
  const resolvedNodes = useExprContext();

  const dispatch = useAppDispatch();
  const langTools = useLanguage();
  const { lang } = langTools;
  const { instanceId } = window;

  const handleConfirmClick = () => {
    if (!disabled && instanceId && resolvedNodes) {
      setValidateId(props.id);
      httpGet(getValidationUrl(instanceId))
        .then((serverValidations: any) => {
          const validationObjects = mapValidationIssues(serverValidations, resolvedNodes, langTools);
          const validationResult = createValidationResult(validationObjects);
          dispatch(
            ValidationActions.updateValidations({
              validationResult,
              merge: false,
            }),
          );
          if (serverValidations.length === 0) {
            dispatch(ProcessActions.complete({ componentId: props.id, action: 'confirm' }));
          }
        })
        .catch((error) => {
          dispatch(ProcessActions.completeRejected({ error: JSON.parse(JSON.stringify(error)) }));
          window.logError('Validating on confirm failed:\n', error);
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
        {lang('confirm.button_text')}
      </SubmitButton>
    </div>
  );
};
