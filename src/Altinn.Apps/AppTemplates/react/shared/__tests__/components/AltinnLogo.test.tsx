
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnLogo from '../../src/components/AltinnLogo';

describe('>>> AltinnLogo', () => {
  let mockColor: string;

  beforeEach(() => {
    mockColor = '#FFF';
  });

  it('+++ Should match snapshot', () => {
    const rendered = renderer.create(
      <AltinnLogo
        color={mockColor}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ Should have correct color', () => {
    const mountedAltinnLogo = mount(
      <AltinnLogo
        color={mockColor}
      />,
    );
    expect(mountedAltinnLogo.find('#Desktop').props().fill).toEqual('#FFF');
  });
});
