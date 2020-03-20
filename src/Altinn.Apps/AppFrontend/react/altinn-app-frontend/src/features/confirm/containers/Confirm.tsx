import * as React from 'react';
import {AltinnButton} from 'altinn-shared/components/AltinnButton';
import {getLanguageFromKey} from 'altinn-shared/utils/language';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import { IAltinnWindow, IRuntimeState } from '../../../types';
import { get } from '../../../utils/networking';
import { getValidationUrl } from '../../../utils/urlHelper';
import FormValidationActions from '../../form/validation/validationActions';
import { mapDataElementValidationToRedux } from '../../../utils/validation';
import { useSelector } from 'react-redux';

export interface IConfirmProps {
  language: any;
  partyId: any;
  instanceGuid: any;
}

export function Confirm(props: IConfirmProps) {
  const { instanceId } = window as Window as IAltinnWindow;
  const layout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);

  const onClickConfirm = () => {
    get(getValidationUrl(instanceId)).then((data: any) => {
      const mappedValidations = mapDataElementValidationToRedux(data, layout, textResources);
      FormValidationActions.updateValidations(mappedValidations);
      if (data.length === 0) {
        ProcessDispatcher.completeProcess();
      }
    });
  }

  return (
  <AltinnButton
    btnText={getLanguageFromKey('confirm.button_text', props.language)}
    onClickFunction={onClickConfirm}
  />
  );
}
