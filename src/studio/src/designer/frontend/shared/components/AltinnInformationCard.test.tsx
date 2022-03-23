import { mount } from 'enzyme';
import React from 'react';
import * as renderer from 'react-test-renderer';
import AltinnInformationCard from './AltinnInformationCard';

describe('AltinnInformationCard', () => {
  let props: any;
  beforeEach(() => {
    props = {
      headerTextKey: 'header',
      subtext1TextKey: 'subtext1',
      subtext2TextKey: 'subtext2',
      linkTextKey: 'linktext',
      urlKey: 'github.com',
      imageSource: 'string',
      shadow: true,
    };
  });

  it('Should match snapshot with all the properties', () => {
    const rendered = renderer.create(<AltinnInformationCard {...props} />);
    expect(rendered).toMatchSnapshot();
  });

  it('Should have a header, subtext, image and  a link and shadow', () => {
    const informationComponent = mount(<AltinnInformationCard {...props} />);
    expect(informationComponent.find('h1').text()).toEqual('header');
    expect(informationComponent.find('p')).toHaveLength(2);
    expect(informationComponent.find('a').text()).toEqual('linktext');
    expect(informationComponent.find('a').prop('href')).toEqual('github.com');
    expect(informationComponent.find('img').prop('src')).toEqual('string');
    expect(informationComponent.hasClass('shadowBox'));
  });
});
