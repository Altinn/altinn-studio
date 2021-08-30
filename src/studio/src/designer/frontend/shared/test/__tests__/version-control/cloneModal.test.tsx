import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import CloneModal from '../../../version-control/cloneModal';

describe('>>> components/version-control/cloneModal.test.tsx', () => {
  let mockClasses: any;
  let element: Element;
  beforeAll(() => {
    mockClasses = {
      modalContainer: '',
      itemSeparator: '',
      sectionSeparator: '',
      blackText: '',
    };
    element = mount(
      <div />,
    ).getDOMNode();
  });

  it('+++ should show copy link if copy feature is supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return true;
    });
    const wrapper = mount(
      <CloneModal
        open={true} anchorEl={element}
        onClose={(null)} language={{}}
        classes={mockClasses}
      />,
    );
    const exists = wrapper.exists('#copy-repository-url-button');
    expect(exists).toBe(true);
  });

  it('+++ should NOT show copy link if copy feature is NOT supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return false;
    });
    const wrapper = mount(
      <CloneModal
        open={true} anchorEl={element}
        onClose={(null)} language={{}}
        classes={mockClasses}
      />,
    );
    const exists = wrapper.exists('#copy-repository-url-button');
    expect(exists).toBe(false);
  });
});
