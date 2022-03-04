import { mount } from 'enzyme';
import 'jest';
import axios from 'axios';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { TopToolbarButton } from '@altinn/schema-editor/index';
import { FileSelector, AltinnSpinner } from 'app-shared/components';
import XSDUpload, { IXSDUploadProps } from '../../../../features/dataModelling/components/XSDUpload';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const defaultProps = {
  language: {
    administration: {},
  },
  org: 'test-org',
  repo: 'test-repo',
  onXSDUploaded: jest.fn(),
};

const mockAnchorEl = document.getElementsByTagName('body')[0];

const mountComponent = (props?: IXSDUploadProps) => {
  const allProps = {
    ...defaultProps,
    ...props,
  };
  // eslint-disable-next-line react/jsx-props-no-spreading
  return mount(<XSDUpload {...allProps} />);
};

describe('XSDUpload', () => {
  it('should not show file picker by default', () => {
    const wrapper = mountComponent();

    expect(wrapper.find(FileSelector).exists()).toBe(false);
  });

  it('should show file picker and hide uploading spinner when clicking TopToolbarButton', () => {
    const wrapper = mountComponent();

    wrapper.find(TopToolbarButton).simulate('click', { currentTarget: mockAnchorEl });

    expect(wrapper.find(FileSelector).exists()).toBe(true);
    expect(wrapper.find(AltinnSpinner).exists()).toBe(false);
  });

  it('should show uploading spinner and hide file picker when file upload is in progress', () => {
    const wrapper = mountComponent();

    mockedAxios.post.mockImplementation(() => new Promise(jest.fn()));

    wrapper.find(TopToolbarButton).simulate('click', { currentTarget: mockAnchorEl });

    act(() => {
      wrapper.find(FileSelector).props().submitHandler(undefined, 'filename');
    });

    wrapper.update();

    expect(wrapper.find(FileSelector).exists()).toBe(false);
    expect(wrapper.find(AltinnSpinner).exists()).toBe(true);
  });

  it('should show error text when file upload results in error', async () => {
    mockedAxios.post.mockImplementation(() => Promise.reject(new Error('mocked error')));
    const wrapper = mountComponent();

    wrapper.find(TopToolbarButton).simulate('click', { currentTarget: mockAnchorEl });
    expect(wrapper.find('[data-test-id="errorText"]').exists()).toBe(false);

    await act(async () => {
      wrapper.find(FileSelector).props().submitHandler(undefined, 'filename');
    });

    wrapper.update();

    expect(wrapper.find('[data-test-id="errorText"]').exists()).toBe(true);
  });

  it('should call onXSDUploaded callback when upload is successful', async () => {
    mockedAxios.post.mockImplementation(() => Promise.resolve({ status: 200 }));
    const handleXSDUploaded = jest.fn();
    const wrapper = mountComponent({ ...defaultProps, onXSDUploaded: handleXSDUploaded });

    wrapper.find(TopToolbarButton).simulate('click', { currentTarget: mockAnchorEl });

    await act(async () => {
      wrapper.find(FileSelector).props().submitHandler(undefined, 'filename');
    });

    wrapper.update();

    expect(handleXSDUploaded).toHaveBeenCalledWith('filename');
    expect(wrapper.find(AltinnSpinner).exists()).toBe(false);
  });
});
