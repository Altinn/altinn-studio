import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest';
import * as React from 'react';
import XSDUploader from '../../../features/dataModelling/components/XSDUploader';

describe('>>> XSDUploader.tsx', () => {
  const language = { administration: {} };
  const xsdUploaded = jest.fn();
  beforeEach(() => {
    xsdUploaded.mockReset();
  });
  const mountComponent = () => mount(<XSDUploader
    language={language}
    onXSDUploaded={xsdUploaded}
  />);
  it('+++ Should match snapshot with the least amount of params', () => {
    const wrapper = mountComponent();
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
