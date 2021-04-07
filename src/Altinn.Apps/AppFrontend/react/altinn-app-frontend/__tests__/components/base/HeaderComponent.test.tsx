import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { mount } from 'enzyme';
import { render, fireEvent } from '@testing-library/react';

import { HeaderComponent, IHeaderProps } from '../../../src/components/base/HeaderComponent';
import { ITextResourceBindings } from '../../../src/types';

describe('>>> components/base/HeaderComponent.tsx --- Snapshot', () => {
  let mockId: string;
  let mockText: string;
  let mockSize: string;
  let mockGetTextResource: (key: string) => string;
  let mockLanguage: any;
  let mockTextResourceBindings: ITextResourceBindings;
  mockId = 'mock-id';
  mockText = 'Here goes a paragraph';
  mockGetTextResource = (key: string) => key;

  beforeEach(() => {
    mockId = 'mock-id';
    mockText = 'test';
    mockSize = 'S';
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={mockSize}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render <h2> if size is \'L\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'L'}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );
    expect(wrapper.find('h2')).toHaveLength(1);
    expect(wrapper.find(`h2[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h3')).toHaveLength(0);
    expect(wrapper.find('h4')).toHaveLength(0);
  });

  it('+++ should render <h3> if size is \'M\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'M'}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );
    expect(wrapper.find('h2')).toHaveLength(0);
    expect(wrapper.find('h3')).toHaveLength(1);
    expect(wrapper.find(`h3[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h4')).toHaveLength(0);
  });

  it('+++ should render <h4> if size is \'S\'', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        size={'S'}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );

    expect(wrapper.find('h2')).toHaveLength(0);
    expect(wrapper.find('h3')).toHaveLength(0);
    expect(wrapper.find(`h4[id='${mockId}']`)).toHaveLength(1);
    expect(wrapper.find('h4')).toHaveLength(1);

  });

  it('+++ should render <h4> if size is not defined', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={mockTextResourceBindings}
      />,
    );
    expect(wrapper.find(`h4[id='${mockId}']`)).toHaveLength(1);
  });

  it('+++ should render help text if help text is supplied', () => {
    const wrapper = mount(
      <HeaderComponent
        id={mockId}
        text={mockText}
        language={mockLanguage}
        getTextResource={mockGetTextResource}
        textResourceBindings={{ help: 'this is the help text'}}
      />,
    );
    expect(wrapper.find('HelpTextContainer')).toHaveLength(1);
  });

  function renderHeaderComponent(props?: Partial<IHeaderProps>){
    const defaultProps: IHeaderProps = {
      id: mockId,
      text: mockText,
      size: mockSize,
      language: mockLanguage,
      textResourceBindings: mockTextResourceBindings,
      getTextResource: mockGetTextResource,
    };

    return render(<HeaderComponent {...defaultProps} {...props}/>);
  }
});
