import * as React from 'react';
import 'jest';
import { mount } from 'enzyme';
import { AltinnAppHeader } from '..';
import { IParty } from '../../types';

describe('>>> AltinnAppHeader.tsx', () => {
  const partyPerson = {
    name: 'Test Testesen',
    ssn: '01010000000',
    partyId: '12345'
  } as IParty;

  const partyOrg = {
    orgNumber: 12345678,
    partyId: '54321',
    name: 'Bedrift'
  } as IParty;
  const logoutText = 'Logg ut';
  const ariaLabel = 'Profilikon meny';
  const headerBackgroundColor = 'blue';
  const logoColor = 'blue';

  it('+++ should render private icon when party is person', () => {
    const wrapper = mount(
      <AltinnAppHeader
        party={partyPerson}
        userParty={partyPerson}
        logoColor={logoColor}
        logoutText={logoutText}
        ariaLabelIcon={ariaLabel}
        headerBackgroundColor={headerBackgroundColor}
      />,
    );
    expect(wrapper.find('i.fa-private-circle-big')).toHaveLength(1);
  });

  it('+++ should render org icon when party is org', () => {
    const wrapper = mount(
      <AltinnAppHeader
        party={partyOrg}
        userParty={partyPerson}
        logoColor={logoColor}
        logoutText={logoutText}
        ariaLabelIcon={ariaLabel}
        headerBackgroundColor={headerBackgroundColor}
      />,
    );
    expect(wrapper.find('i.fa-corp-circle-big')).toHaveLength(1);
  });

  it('+++ should render menu with logout option when clicking profile icon', () => {
    const wrapper = mount(
      <AltinnAppHeader
        party={partyOrg}
        userParty={partyPerson}
        logoColor={logoColor}
        logoutText={logoutText}
        ariaLabelIcon={ariaLabel}
        headerBackgroundColor={headerBackgroundColor}
      />,
    );
    wrapper.find('#profile-icon-button').hostNodes().simulate('click');
    expect(wrapper.find('#profile-menu').hostNodes()).toHaveLength(1);
    expect(wrapper.find('#logout-menu-item').hostNodes()).toHaveLength(1);
    expect(wrapper.find('#logout-menu-item').hostNodes().text()).toEqual("Logg ut");
  });
});
