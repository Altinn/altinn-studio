import * as React from 'react';
import 'jest';
import { mount } from 'enzyme';
import { AltinnAppHeader } from '../../src/components';
import { IParty } from '../../src/types';

describe('>>> AltinnAppHeader.tsx', () => {
  let partyPerson = {
    name: 'Test Testesen',
    ssn: '01010000000',
    partyId: '12345'
  } as IParty;

  let partyOrg = {
    orgNumber: 12345678,
    partyId: '54321',
    name: 'Bedrift'
  } as IParty;
  let logoutText = 'Logg ut';
  let ariaLabel = 'Profilikon meny';
  let headerBackgroundColor = 'blue';
  let logoColor = 'blue';

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
