import React, { type ReactElement } from 'react';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { StudioList, StudioLink } from 'libs/studio-components-legacy/src';
import { Trans } from 'react-i18next';
import { PhoneContactProvider } from 'app-shared/getInTouch/providers/PhoneContactProvider';

export const ContactServiceDesk = (): ReactElement => {
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
  const contactByPhone = new GetInTouchWith(new PhoneContactProvider());
  return (
    <StudioList.Root>
      <StudioList.Unordered>
        <StudioList.Item>
          <Trans
            i18nKey='contact.serviceDesk.phone'
            components={{
              b: <b />,
              a: <StudioLink href={contactByPhone.url('phone')}>{null}</StudioLink>,
            }}
          />
        </StudioList.Item>

        <StudioList.Item>
          <Trans
            i18nKey='contact.serviceDesk.emergencyPhone'
            values={{ phoneNumber: contactByPhone.url('phone') }}
            components={{
              b: <b />,
              a: <StudioLink href={contactByPhone.url('emergencyPhone')}>{null}</StudioLink>,
            }}
          />
        </StudioList.Item>

        <StudioList.Item>
          <Trans
            i18nKey='contact.serviceDesk.email'
            values={{ phoneNumber: contactByPhone.url('phone') }}
            components={{
              b: <b />,
              a: <StudioLink href={contactByEmail.url('serviceOwner')}>{null}</StudioLink>,
            }}
          />
        </StudioList.Item>
      </StudioList.Unordered>
    </StudioList.Root>
  );
};
