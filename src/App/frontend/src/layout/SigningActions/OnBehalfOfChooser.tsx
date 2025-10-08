import React from 'react';
import type { ChangeEvent } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { RadioButton } from 'src/components/form/RadioButton';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { type SigneeState } from 'src/layout/SigneeList/api';
import type { AuthorizedOrganizationDetails } from 'src/layout/SigningActions/api';

interface OnBehalfOfChooserProps {
  currentUserSignee: SigneeState | undefined;
  authorizedOrganizationDetails: AuthorizedOrganizationDetails['organizations'];
  onBehalfOfOrg: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: boolean;
}

export const OnBehalfOfChooser = ({
  currentUserSignee,
  authorizedOrganizationDetails,
  onBehalfOfOrg,
  onChange,
  error = false,
}: Readonly<OnBehalfOfChooserProps>) => {
  const mySelf = useLanguage().langAsString('signing.submit_panel_myself_choice');

  return (
    <Fieldset
      legend={<Lang id='signing.submit_panel_radio_group_legend' />}
      description={<Lang id='signing.submit_panel_radio_group_description' />}
      required={true}
      requiredIndicator={<RequiredIndicator />}
    >
      {currentUserSignee && (
        <RadioButton
          value=''
          label={mySelf}
          name='onBehalfOf'
          key={currentUserSignee.partyId}
          onChange={onChange}
          checked={onBehalfOfOrg === ''}
        />
      )}

      {authorizedOrganizationDetails.map((org) => (
        <RadioButton
          value={org.orgNumber}
          label={org.orgName}
          name='onBehalfOf'
          key={org.partyId}
          onChange={onChange}
          checked={onBehalfOfOrg === org.orgNumber}
        />
      ))}
      {error && (
        <ValidationMessage data-size='sm'>
          <Lang id='signing.error_signing_no_on_behalf_of' />
        </ValidationMessage>
      )}
    </Fieldset>
  );
};
