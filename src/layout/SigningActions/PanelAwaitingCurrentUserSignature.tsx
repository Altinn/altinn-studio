import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Checkbox, Heading, Spinner, ValidationMessage } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import { Panel } from 'src/app-components/Panel/Panel';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import {
  useAuthorizedOrganizationDetails,
  useSigningMutation,
  useUserSigneeParties,
} from 'src/layout/SigningActions/api';
import { OnBehalfOfChooser } from 'src/layout/SigningActions/OnBehalfOfChooser';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import classes from 'src/layout/SigningActions/SigningActions.module.css';
import { SubmitSigningButton } from 'src/layout/SigningActions/SubmitSigningButton';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type AwaitingCurrentUserSignaturePanelProps = {
  node: LayoutNode<'SigningActions'>;
  hasMissingSignatures: boolean;
};

const emptyArray = [];

export function AwaitingCurrentUserSignaturePanel({
  node,
  hasMissingSignatures,
}: Readonly<AwaitingCurrentUserSignaturePanelProps>) {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const isAuthorized = useIsAuthorized();
  const canSign = isAuthorized('sign');
  const canWrite = isAuthorized('write');

  const currentUserPartyId = useProfile()?.partyId;
  const { textResourceBindings } = useItemWhenType(node.baseId, 'SigningActions');
  const { langAsString } = useLanguage();

  const title = textResourceBindings?.awaitingSignaturePanelTitle ?? 'signing.awaiting_signature_panel_title';
  const checkboxLabel = textResourceBindings?.checkboxLabel ?? 'signing.checkbox_label';
  const checkboxDescription = textResourceBindings?.checkboxDescription;
  const signingButtonText = textResourceBindings?.signingButton ?? 'signing.sign_button';

  const [confirmReadDocuments, setConfirmReadDocuments] = useState(false);
  const [onBehalfOf, setOnBehalfOf] = useState<string | null>(null);
  const [onBehalfOfError, setOnBehalfOfError] = useState(false);
  const [confirmReadDocumentsError, setConfirmReadDocumentsError] = useState(false);

  const { data: authorizedOrganizationDetails, isLoading: isApiLoading } = useAuthorizedOrganizationDetails(
    instanceOwnerPartyId!,
    instanceGuid!,
  );

  const userSigneeParties = useUserSigneeParties();
  const unsignedUserSigneeParties = userSigneeParties.filter((party) => !party.hasSigned);
  const unsignedAuthorizedOrgSignees =
    authorizedOrganizationDetails?.organizations.filter((org) =>
      unsignedUserSigneeParties.some((s) => s.partyId === org.partyId),
    ) ?? emptyArray;

  const { mutate: signingMutation, error: signingError, isPending } = useSigningMutation();

  function validate() {
    const hasReadDocuments = confirmReadDocuments;
    const hasChosenOnBehalfOf = unsignedUserSigneeParties.length <= 1 || onBehalfOf !== null;

    setConfirmReadDocumentsError(!hasReadDocuments);
    setOnBehalfOfError(!hasChosenOnBehalfOf);

    return hasReadDocuments && hasChosenOnBehalfOf;
  }

  function handleSigning() {
    // Validate fields before submitting
    const isValid = validate();

    if (isValid) {
      signingMutation(onBehalfOf, {
        onSuccess: () => {
          setConfirmReadDocuments(false);
          setOnBehalfOf(null);
        },
      });
    }
  }

  // Set the org number automatically when there's only unsigned party and it is an org
  useEffect(() => {
    if (
      unsignedUserSigneeParties.length === 1 &&
      unsignedUserSigneeParties[0].partyId === unsignedAuthorizedOrgSignees.at(0)?.partyId
    ) {
      setOnBehalfOf(unsignedAuthorizedOrgSignees[0].orgNumber);
    }
  }, [unsignedUserSigneeParties, unsignedAuthorizedOrgSignees]);

  // This shouldn't really happen, but if it does it indicates that our backend is out of sync with Autorisasjon somehow
  if (!canSign) {
    return <UnknownError />;
  }

  if (isApiLoading) {
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

  return (
    <SigningPanel
      node={node}
      variant='info'
      heading={<Lang id={title} />}
      actionButton={
        <>
          <Button
            onClick={handleSigning}
            disabled={isPending}
            size='md'
            color='success'
          >
            <Lang id={signingButtonText} />
          </Button>
          {!hasMissingSignatures && canWrite && <SubmitSigningButton node={node} />}
        </>
      }
      description={<Lang id={checkboxDescription} />}
      errorMessage={signingError ? <Lang id='signing.error_signing' /> : undefined}
    >
      {unsignedUserSigneeParties.length > 1 && (
        <OnBehalfOfChooser
          currentUserSignee={unsignedUserSigneeParties.find((s) => s.partyId === currentUserPartyId)}
          authorizedOrganizationDetails={unsignedAuthorizedOrgSignees}
          onBehalfOfOrg={onBehalfOf}
          error={onBehalfOfError}
          onChange={(e) => {
            setOnBehalfOf(e.target.value);
            setOnBehalfOfError(false);
          }}
        />
      )}
      {unsignedUserSigneeParties.length === 1 && unsignedUserSigneeParties.at(0)?.organization && (
        <Heading
          level={1}
          data-size='2xs'
        >
          <Lang
            id='signing.submit_panel_single_org_choice'
            params={[unsignedUserSigneeParties.at(0)?.organization ?? '']}
          />
        </Heading>
      )}
      <div>
        <Checkbox
          value={checkboxLabel}
          checked={confirmReadDocuments}
          onChange={() => {
            setConfirmReadDocuments(!confirmReadDocuments);
            setConfirmReadDocumentsError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setConfirmReadDocuments(!confirmReadDocuments);
              setConfirmReadDocumentsError(false);
            }
          }}
          className={classes.checkbox}
          label={<Lang id={checkboxLabel} />}
        />
        {confirmReadDocumentsError && (
          <ValidationMessage data-size='sm'>
            <Lang id='signing.error_signing_not_confirmed_documents' />
          </ValidationMessage>
        )}
      </div>
    </SigningPanel>
  );
}
