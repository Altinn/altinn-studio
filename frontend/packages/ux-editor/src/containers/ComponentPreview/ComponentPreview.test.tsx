import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import { ComponentPreview, ComponentPreviewProps } from './ComponentPreview';
import { FormItemType } from 'app-shared/types/FormItemType';
import { FormComponent } from '../../types/FormComponent';
import { componentMocks } from '../../testing/componentMocks';

// Test data:
const handleComponentChange = jest.fn();
const defaultProps: ComponentPreviewProps = {
  component: componentMocks[FormItemType.Checkboxes],
  handleComponentChange,
};

// Mocks:
const checkboxGroupPreviewId = 'CheckboxGroupPreview';
jest.mock('./CheckboxGroupPreview', () => ({
  CheckboxGroupPreview: () => <div data-testid={checkboxGroupPreviewId} />,
}));
const radioGroupPreviewId = 'RadioGroupPreview';
jest.mock('./RadioGroupPreview', () => ({
  RadioGroupPreview: () => <div data-testid={radioGroupPreviewId} />,
}));

describe('ComponentPreview', () => {
  afterEach(jest.resetAllMocks);

  it('Renders CheckboxGroupPreview when component type is Checkboxes', () => {
    render({ component: componentMocks[FormItemType.Checkboxes] });
    expect(screen.getByTestId(checkboxGroupPreviewId)).toBeInTheDocument();
  });

  it('Renders RadioGroupPreview when component type is RadioButtons', () => {
    render({ component: componentMocks[FormItemType.RadioButtons] });
    expect(screen.getByTestId(radioGroupPreviewId)).toBeInTheDocument();
  });

  it('Does not display error message when component is valid', () => {
    render({ component: componentMocks[FormItemType.Checkboxes] });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Displays error message when component is invalid', () => {
    const invalidComponent: FormComponent = {
      type: FormItemType.Checkboxes,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option1' },
      ],
      id: 'test',
      optionsId: 'test',
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };
    render({ component: invalidComponent });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it.each([
    FormItemType.AddressComponent,
    FormItemType.AttachmentList,
    FormItemType.Datepicker,
    FormItemType.Dropdown,
    FormItemType.FileUpload,
    FormItemType.FileUploadWithTag,
    FormItemType.Group,
    FormItemType.Header,
    FormItemType.Image,
    FormItemType.Input,
    FormItemType.NavigationBar,
    FormItemType.Map,
    FormItemType.Panel,
    FormItemType.Paragraph,
    FormItemType.TextArea,
    FormItemType.ThirdParty,
  ])('Renders error text when component type is %s', (type: FormItemType) => {
    render({ component: componentMocks[type] });
    expect(
      screen.getByText('Forhåndsvisning er ikke implementert for denne komponenten.')
    ).toBeInTheDocument();
  });
});

const render = (props: Partial<ComponentPreviewProps> = {}) =>
  renderRtl(<ComponentPreview {...defaultProps} {...props} />);
