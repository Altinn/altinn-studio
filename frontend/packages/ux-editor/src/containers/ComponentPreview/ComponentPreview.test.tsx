import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import { ComponentPreview, ComponentPreviewProps } from './ComponentPreview';
import { ComponentType } from '../../components';
import { FormComponent } from '../../types/FormComponent';
import { componentMocks } from '../../testing/componentMocks';

// Test data:
const handleComponentChange = jest.fn();
const defaultProps: ComponentPreviewProps = {
  component: componentMocks[ComponentType.Checkboxes],
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
    render({ component: componentMocks[ComponentType.Checkboxes] });
    expect(screen.getByTestId(checkboxGroupPreviewId)).toBeInTheDocument();
  });

  it('Renders RadioGroupPreview when component type is RadioButtons', () => {
    render({ component: componentMocks[ComponentType.RadioButtons] });
    expect(screen.getByTestId(radioGroupPreviewId)).toBeInTheDocument();
  });

  it('Does not display error message when component is valid', () => {
    render({ component: componentMocks[ComponentType.Checkboxes] });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Displays error message when component is invalid', () => {
    const invalidComponent: FormComponent = {
      type: ComponentType.Checkboxes,
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
    ComponentType.AddressComponent,
    ComponentType.AttachmentList,
    ComponentType.Datepicker,
    ComponentType.Dropdown,
    ComponentType.FileUpload,
    ComponentType.FileUploadWithTag,
    ComponentType.Group,
    ComponentType.Header,
    ComponentType.Image,
    ComponentType.Input,
    ComponentType.NavigationBar,
    ComponentType.Map,
    ComponentType.Panel,
    ComponentType.Paragraph,
    ComponentType.TextArea,
    ComponentType.ThirdParty,
  ])('Renders error text when component type is %s', (type: ComponentType) => {
    render({ component: componentMocks[type] });
    expect(
      screen.getByText('Forhåndsvisning er ikke implementert for denne komponenten.')
    ).toBeInTheDocument();
  });
});

const render = (props: Partial<ComponentPreviewProps> = {}) =>
  renderRtl(<ComponentPreview {...defaultProps} {...props} />);
