
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { IComponentProps } from 'src/components';
import { ParagraphComponent } from '../../../src/components/base/ParagraphComponent';
import { ITextResourceBindings } from '../../../src/features/form/layout';

describe('>>> components/base/ParagraphComponent.tsx --- Snapshot', () => {
  const mockId = 'mock-id';
  const mockText = 'Here goes a paragraph';
  const mockGetTextResource = (key: string) => key;
  const mockLanguage: any = {};
  const mockTextResourceBindings: ITextResourceBindings = {
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
        {...({} as IComponentProps)}
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
        {...({} as IComponentProps)}
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
        textResourceBindings={{ help: 'this is the help text' }}
        {...({} as IComponentProps)}
      />,
    );

    expect(shallowParagraphComponent.find('HelpTextContainer')).toHaveLength(1);
  });
});
