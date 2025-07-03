import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Spinner } from '@digdir/designsystemet-react';

import { Panel } from 'src/app-components/Panel/Panel';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useSigneeList } from 'src/layout/SigneeList/api';
import { useSignaturesValidation, useUserSigneeParties } from 'src/layout/SigningActions/api';
import { AwaitingCurrentUserSignaturePanel } from 'src/layout/SigningActions/PanelAwaitingCurrentUserSignature';
import { AwaitingOtherSignaturesPanel } from 'src/layout/SigningActions/PanelAwaitingOtherSignatures';
import { NoActionRequiredPanel } from 'src/layout/SigningActions/PanelNoActionRequired';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitPanel } from 'src/layout/SigningActions/PanelSubmit';
import classes from 'src/layout/SigningActions/SigningActions.module.css';
import { getCurrentUserStatus } from 'src/layout/SigningActions/utils';
import type { PropsFromGenericComponent } from 'src/layout';

export function SigningActionsComponent({ node }: PropsFromGenericComponent<'SigningActions'>) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const {
    data: signeeList,
    isLoading: isSigneeListLoading,
    error: signeeListError,
  } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);

  const currentUserPartyId = useProfile()?.partyId;
  const { langAsString } = useLanguage();

  const isAuthorized = useIsAuthorized();
  const canSign = isAuthorized('sign');
  const canWrite = useIsAuthorized()('write');

  const userSigneeParties = useUserSigneeParties();
  const currentUserStatus = getCurrentUserStatus(currentUserPartyId, userSigneeParties, canSign);

  const { refetchValidations, hasMissingSignatures } = useSignaturesValidation();

  useEffect(() => {
    refetchValidations();
  }, [refetchValidations, signeeList]);

  if (isSigneeListLoading) {
    return (
      <Panel
        variant='info'
        isOnBottom
      >
        <div className={classes.loadingContainer}>
          <Spinner aria-label={langAsString('signing.loading')} />
        </div>
      </Panel>
    );
  }

  if (signeeListError) {
    return (
      <SigningPanel
        node={node}
        heading={<Lang id='signing.api_error_panel_title' />}
        description={<Lang id='signing.api_error_panel_description' />}
        variant='error'
      />
    );
  }

  const hasDelegationError = signeeList?.some((signee) => !signee.delegationSuccessful && !signee.hasSigned);
  if (hasDelegationError) {
    return (
      <SigningPanel
        node={node}
        heading={<Lang id='signing.delegation_error_panel_title' />}
        description={<Lang id='signing.delegation_error_panel_description' />}
        variant='error'
      />
    );
  }

  if (currentUserStatus === 'awaitingSignature') {
    return (
      <AwaitingCurrentUserSignaturePanel
        node={node}
        hasMissingSignatures={!!hasMissingSignatures}
      />
    );
  }

  if (!canWrite) {
    return (
      <NoActionRequiredPanel
        node={node}
        hasSigned={currentUserStatus === 'signed'}
      />
    );
  }

  if (hasMissingSignatures) {
    return (
      <AwaitingOtherSignaturesPanel
        node={node}
        hasSigned={currentUserStatus === 'signed'}
      />
    );
  }

  return <SubmitPanel node={node} />;
}
