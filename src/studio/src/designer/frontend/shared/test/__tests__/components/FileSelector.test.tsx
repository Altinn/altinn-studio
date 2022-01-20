import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import FileSelector from '../../../components/FileSelector';

describe('>>> FileSelector.tsx', () => {
  const language = { general: { label: 'download' }, shared: { submit_upload: 'upload' } };
  const submitHandler = jest.fn();
  beforeEach(() => {
    submitHandler.mockReset();
  });
  const mountComponent = (busy: boolean) => mount(<FileSelector
    language={language}
    labelTextResource='general.label'
    busy={busy}
    accept='.xsd'
    formFileName='thefile'
    submitHandler={submitHandler}
  />);

  it('+++ should not submit without file selected', () => {
    const wrapper = mountComponent(false);
    const submitButton = wrapper.find('button');
    expect(submitButton).toHaveLength(1);
    submitButton.simulate('click');
    expect(submitButton.props().disabled).toBe(true);
    expect(submitHandler).toHaveBeenCalledTimes(0);
  });
});
