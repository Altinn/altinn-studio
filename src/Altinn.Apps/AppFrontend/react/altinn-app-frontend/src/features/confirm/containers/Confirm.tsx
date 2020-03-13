import * as React from 'react';
import {AltinnButton} from 'altinn-shared/components/AltinnButton';
import {getLanguageFromKey} from 'altinn-shared/utils/language';
import ProcessDispatcher from '../../../shared/resources/process/processDispatcher';
import { IAltinnWindow } from '../../../types';
import { get } from '../../../utils/networking';
import { getValidationUrl } from '../../../utils/urlHelper';

export interface IConfirmProps {
  language: any;
  partyId: any;
  instanceGuid: any;
}

// export function getValidationStatus

export function Confirm(props: IConfirmProps) {
  const { instanceId } = window as Window as IAltinnWindow;
  const [canConfirm, setCanConfirm] = React.useState<boolean>()
  const onClickConfirm = () => {
    ProcessDispatcher.completeProcess();
  }

  React.useEffect(() => {
    get(getValidationUrl(instanceId)).then((data: any) => {
      setCanConfirm(data.length === 0);
    });
  }, []);

  return (
  <AltinnButton
    btnText={getLanguageFromKey('confirm.button_text', props.language)}
    onClickFunction={onClickConfirm}
    disabled={!canConfirm}
  />
  );
}