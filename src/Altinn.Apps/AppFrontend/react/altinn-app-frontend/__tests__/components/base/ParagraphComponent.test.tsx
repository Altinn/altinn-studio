
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { ParagraphComponent } from '../../../src/components/base/ParagraphComponent';
import { ITextResourceBindings } from '../../../src/features/form/layout';

describe('>>> components/base/ParagraphComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;
  let mockGetTextResource: (key: string) => string;
  let mockLanguage: any;
  let mockTextResourceBindings: ITextResourceBindings;
  mockId = 'mock-id';
  mockText = 'Here goes a paragraph';
  mockGetTextResource = (key: string) => key;
  mockLanguage = {};
  mockTextResourceBindings = {
    tile: mockText,
  }

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <ParagraphComponent
        id={mockId}
        text={mockText}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
  it('+++ should have correct text', () => {
    const shallowParagraphComponent = shallow(
      <ParagraphComponent
        id={mockId}
        text={'some other text'}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );

    expect(shallowParagraphComponent.text()).toEqual('some other text');
  });

  it('+++ should render help text if help text is supplied', () => {
    const shallowParagraphComponent = shallow(
      <ParagraphComponent
        id={mockId}
        text={mockText}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={{ help: 'this is the help text'}}
      />,
    );

    expect(shallowParagraphComponent.find('HelpTextContainer')).toHaveLength(1);
  });
});
