import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { EditModalContent } from './EditModalContent';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('EditModalContent', () => {
  it('should return input specific content when type input', () => {
    const { rendered } = render({
      componentProps: {
        type: 'Input',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(6);
  });

  it('should return header specific content when type header', () => {
    const { rendered } = render({
      componentProps: {
        type: 'Header',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(3);
  });

  it('should return file uploader specific content when type file uploader', () => {
    const { rendered } = render({
      componentProps: {
        type: 'FileUpload',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(10);
  });

  it('should call handleComponentUpdate with max number of attachments to 1 when clearing max number of attachments', async () => {
    const handleUpdate = jest.fn();
    const { allComponentProps } = render({
      componentProps: {
        maxNumberOfAttachments: 3,
        type: 'FileUpload',
      },
      handleComponentUpdate: handleUpdate,
    });

    const maxFilesInput = screen.getByRole('spinbutton', {
      name: /ux_editor\.modal_properties_maximum_files/i,
    });

    await user.clear(maxFilesInput);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...allComponentProps,
      maxNumberOfAttachments: 1,
    });
  });

  it('should call handleComponentUpdate with required: false when min number of attachments is set to 0', async () => {
    const handleUpdate = jest.fn();
    const { allComponentProps } = render({
      componentProps: {
        required: true,
        minNumberOfAttachments: 1,
        type: 'FileUpload',
      },
      handleComponentUpdate: handleUpdate,
    });

    const minFilesInput = screen.getByRole('spinbutton', {
      name: /ux_editor\.modal_properties_minimum_files/i,
    });

    await user.clear(minFilesInput);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...allComponentProps,
      required: false,
      minNumberOfAttachments: 0,
    });
  });

  it('should return button spesific content when type button', () => {
    const { rendered } = render({
      componentProps: {
        type: 'Button',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(3);
  });

  it('should render Image component when component type is Image', () => {
    render({
      componentProps: {
        type: 'Image',
      },
    });

    expect(screen.getByTestId('ImageComponent')).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', () => {
    render({
      componentProps: {
        type: 'Button',
      },
    });

    expect(screen.queryByTestId('ImageComponent')).not.toBeInTheDocument();
  });
});

const render = ({
  componentProps = undefined,
  handleComponentUpdate = jest.fn,
} = {}) => {
  const createStore = configureStore();
  const mockLanguage = {
    general: {
      label: '',
      value: '',
    },
    ux_editor: {
      modal_header_type_h2: 'H2',
      modal_header_type_h3: 'H3',
      modal_header_type_h4: 'H4',
      modal_properties_image_src_value_label: 'Source',
      modal_properties_image_placement_label: 'Placement',
      modal_properties_image_alt_text_label: 'Alt text',
      modal_properties_image_width_label: 'Width',
    },
  };
  const initialState = {
    appData: {
      codeLists: {
        codeLists: [] as any,
        error: null as any,
        fetched: true,
        fetching: false,
      },
      languageState: {
        language: mockLanguage,
      },
      dataModel: {
        model: [] as any[],
      },
      textResources: {
        resources: [{ id: 'appName', value: 'Test' }],
      },
    },
    thirdPartyComponents: {
      components: null as any,
      error: null as any,
    },
    formDesigner: {
      layout: {
        selectedLayout: 'FormLayout',
        layouts: {
          FormLayout: {
            components: {},
            containers: {},
          },
        },
      },
    },
  };

  const store = createStore(initialState);

  const allComponentProps = {
    dataModelBindings: {},
    readOnly: false,
    required: false,
    textResourceBindings: {
      title: 'title',
    },
    type: 'Input',
    ...componentProps,
  };

  return {
    rendered: rtlRender(
      <Provider store={store}>
        <EditModalContent
          component={allComponentProps}
          language={mockLanguage}
          handleComponentUpdate={handleComponentUpdate}
        />
      </Provider>,
    ),
    allComponentProps,
  };
};
