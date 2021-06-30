/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnLogo from '../../src/components/AltinnLogo';
import altinnTheme from '../../src/theme/altinnAppTheme';

describe('>>> AltinnLogo', () => {
  let mockColor: string;

  beforeEach(() => {
    mockColor = altinnTheme.altinnPalette.primary.blueDarker;
  });

  it('+++ Should match snapshot', () => {
    const rendered = renderer.create(
      <AltinnLogo
        color={mockColor}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ Should have correct color - blueDark', () => {
    const mountedAltinnLogo = mount(
      <AltinnLogo
        color={mockColor}
      />,
    );
    expect(mountedAltinnLogo.find('#logo').getDOMNode().getAttribute('src')).toEqual('https://altinncdn.no/img/Altinn-logo-black.svg');
    expect(mountedAltinnLogo.find('#logo').getDOMNode().getAttribute('class')).toEqual('logo logo-filter-022F51');
  });

  it('+++ Should have correct color - white', () => {
    const mountedAltinnLogo = mount(
      <AltinnLogo
        color='white'
      />,
    );
    expect(mountedAltinnLogo.find('#logo').getDOMNode().getAttribute('src')).toEqual('https://altinncdn.no/img/Altinn-logo-white.svg');
    expect(mountedAltinnLogo.find('#logo').getDOMNode().getAttribute('class')).toEqual('logo');
  });
});
