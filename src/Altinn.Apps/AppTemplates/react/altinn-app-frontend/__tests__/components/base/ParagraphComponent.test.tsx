
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { ParagraphComponent } from '../../../src/components/base/ParagraphComponent';

describe('>>> components/base/ParagraphComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;
  mockId = 'mock-id';
  mockText = 'Here goes a paragraph';

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <ParagraphComponent
        id={mockId}
        text={mockText}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should have correct text', () => {
    const shallowParagraphComponent = shallow(
      <ParagraphComponent
        id={mockId}
        text={'some other text'}
      />,
    );

    expect(shallowParagraphComponent.text()).toEqual('some other text');
  });
});
