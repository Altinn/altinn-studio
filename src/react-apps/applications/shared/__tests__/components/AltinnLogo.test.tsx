/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import AltinnLogo from '../../src/components/AltinnLogo';

describe('>>> AltinnLogo', () => {
  let mockColor: string;

  beforeEach(() => {
    mockColor = '#FFF';
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
