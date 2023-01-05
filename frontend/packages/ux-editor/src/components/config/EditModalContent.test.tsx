import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { EditModalContent } from './EditModalContent';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IAppState } from '../../types/global';
import { appDataMock, appStateMock } from '../../testing/mocks';

const user = userEvent.setup();

// Test data:
const srcValueLabel = 'Source';

describe('EditModalContent', () => {
  it('should return input specific content when type input', () => {
    const { rendered } = render({
      componentProps: {
        type: 'Input',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(4);
  });

  it('should return header specific content when type header', () => {
    const { rendered } = render({
      componentProps: {
        type: 'Header',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(2);
  });

  it('should return file uploader specific content when type file uploader', () => {
    const { rendered } = render({
      componentProps: {
        type: 'FileUpload',
      },
    });

    expect(rendered.container.querySelectorAll('input').length).toBe(8);
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

    const maxFilesInput = screen.getByLabelText('ux_editor.modal_properties_maximum_files');

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

    const minFilesInput = screen.getByLabelText('ux_editor.modal_properties_minimum_files');

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

    expect(rendered.getByTestId('component-id-inputundefined-default')).toBeInTheDocument();
    expect(rendered.queryAllByRole('combobox').length).toBe(1);
  });

  it('should render Image component when component type is Image', () => {
    render({
      componentProps: {
        type: 'Image',
      },
    });

    expect(screen.getByLabelText(srcValueLabel)).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', () => {
    render({
      componentProps: {
        type: 'Button',
      },
    });

    expect(screen.queryByLabelText(srcValueLabel)).not.toBeInTheDocument();
  });
});

const render = ({ componentProps = undefined, handleComponentUpdate = jest.fn } = {}) => {
  const createStore = configureStore();
  const mockLanguage = {
    'general.label': '',
    'general.value': '',
    'ux_editor.modal_header_type_h2': 'H2',
    'ux_editor.modal_header_type_h3': 'H3',
    'ux_editor.modal_header_type_h4': 'H4',
    'ux_editor.modal_properties_image_src_value_label': srcValueLabel,
    'ux_editor.modal_properties_image_placement_label': 'Placement',
    'ux_editor.modal_properties_image_alt_text_label': 'Alt text',
    'ux_editor.modal_properties_image_width_label': 'Width',
  };
  const initialState: IAppState = {
    ...appStateMock,
    appData: {
      ...appDataMock,
      languageState: {
        language: mockLanguage,
        error: null,
      },
      dataModel: {
        model: [] as any[],
        fetching: false,
        fetched: true,
        error: null,
      },
      textResources: {
        error: null,
        fetched: true,
        fetching: false,
        language: 'nb',
        languages: ['nb'],
        resources: { nb: [{ id: 'appName', value: 'Test' }] },
        saved: true,
        saving: false,
      },
    },
    formDesigner: {
      layout: {
        activeContainer: null,
        activeList: null,
        error: null,
        fetched: true,
        fetching: false,
        invalidLayouts: [],
        layoutSettings: null,
        layouts: {
          FormLayout: {
            components: {},
            containers: {},
            order: {},
          },
        },
        saving: false,
        selectedLayout: 'FormLayout',
        unSavedChanges: false,
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
          handleComponentUpdate={handleComponentUpdate}
        />
      </Provider>
    ),
    allComponentProps,
  };
};
