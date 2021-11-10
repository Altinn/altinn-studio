
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import AltinnColumnLayout from '../../../components/AltinnColumnLayout';

describe('>>> AltinnColumnLayout', () => {
  let mockHeader: string;
  let mockChildren: any;
  let mockSideMenuChildren: any;
  let mockAboveColumnChildren: any;

  beforeEach(() => {
    mockHeader = 'Header text';
    mockChildren = <div id='childId'>Some content</div>;
    mockSideMenuChildren = <div id='sideMenuId'>Some content</div>;
    mockAboveColumnChildren = <div id='aboveColumnId'>Some content</div>;
  });

  it('+++ should render all children', () => {
    const mounted = mount(
      <AltinnColumnLayout
        header={mockHeader}
        children={mockChildren}
        sideMenuChildren={mockSideMenuChildren}
        aboveColumnChildren={mockAboveColumnChildren}
      />,
    );
    const children = mounted.find('#childId');
    const sideMenuChildren = mounted.find('#sideMenuId');
    const aboveColumnChildren = mounted.find('#aboveColumnId');
    expect(children.length).toBe(1);
    expect(sideMenuChildren.length).toBe(1);
    expect(aboveColumnChildren.length).toBe(1);
  });

});
