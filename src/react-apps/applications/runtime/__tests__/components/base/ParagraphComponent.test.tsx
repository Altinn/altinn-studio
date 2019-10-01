/* tslint:disable:jsx-wrap-multiline */
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { ParagraphComponent } from '../../../src/components/base/ParagraphComponent';

describe('>>> components/base/ParagraphComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;
  mockId = 'mock-id';
  mockText = 'Here goes a paragraph';

  it('+++ should have correct text', () => {
    const shallowParagraphComponent = shallow(
      <ParagraphComponent
        id={mockId}
        text={'some other text'}
      />,
    );
    expect(shallowParagraphComponent.contains(<span id={'mock-id'}>some other text</span>)).toBe(true);
  });
});
