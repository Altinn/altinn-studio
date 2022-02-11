import { mount } from 'enzyme';
import React from 'react';
import * as renderer from 'react-test-renderer';

import Header from './altinnAppHeader';

describe('features/altinnAppHeader.tsx', () => {
  let mockLanguage: any;
  let mockProfile: any;
  beforeEach(() => {
    mockLanguage = {
      language: {
        instantiate: {
          all_forms: 'alle skjema',
          inbox: 'innboks',
          profile: 'profil',
        },
      },
    };
    mockProfile = {
      error: null,
      profile: {
        party: {
          person: {
            firstName: 'Ola',
            middleName: null,
            lastName: 'Privatperson',
          },
          partyId: '123456',
          organisation: null,
        },
      },
    };
  });

  it('should match snapshot', () => {
    const rendered = renderer.create(
      <Header
        type='partyChoice'
        language={mockLanguage}
        profile={mockProfile.profile}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render linklist if no type', () => {
    const mountedHeader = mount(
      <Header language={mockLanguage} profile={mockProfile} />,
    );
    expect(mountedHeader.exists('ul')).toEqual(false);
  });
});
