/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import Header from '../../src/shared/components/altinnAppHeader';

describe('>>> features/altinnAppHeader.tsx', () => {
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
          organisation: null,
        },
      },
    };
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
        <Header
          type='partyChoice'
          language={mockLanguage}
          profile={mockProfile}
        />,
    );
    expect(rendered).toMatchSnapshot();
  });

  // it('+++ should render partyChoice spesific layout', () => {
  //   const mountedHeader = mount(
  //     <Header
  //         type='partyChoice'
  //         language={mockLanguage}
  //         profile={mockProfile}
  //     />,
  //   );
  //   expect(mountedHeader.exists('ul')).toEqual(true);
  //   expect(mountedHeader.find('header').props().className).toEqual('MuiPaper-root-23 MuiPaper-elevation4-29' +
  //   ' MuiAppBar-root-14 MuiAppBar-positionStatic-18 MuiAppBar-colorPrimary-21 AltinnAppHeader-partyChoice-8');
  // });

  it('+++ should not render linklist if no type', () => {
    const mountedHeader = mount(
      <Header
          language={mockLanguage}
          profile={mockProfile}
      />,
    );
    expect(mountedHeader.exists('ul')).toEqual(false);
  });
});
