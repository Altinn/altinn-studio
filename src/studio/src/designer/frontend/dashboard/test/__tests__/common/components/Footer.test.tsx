import 'jest';
import * as React from 'react';
import { shallow } from 'enzyme';

import { Footer } from 'common/components/Footer';

describe('Dashboard > Common > Components > Footer', () => {
  it('should render', () => {
    const component = shallow(<Footer />);

    expect(component.isEmptyRender()).toBe(false);
  });
});
