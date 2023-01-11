import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import { ComponentPreview, ComponentPreviewProps } from './ComponentPreview';
import { FormComponentType, IFormCheckboxComponent, IFormRadioButtonComponent } from '../../types/global';
import { ComponentTypes } from '../../components';

// Test data:
const component: FormComponentType = { id: '1' };
const handleComponentChange = jest.fn();
const defaultProps: ComponentPreviewProps = {
  component,
  handleComponentChange,
};

// Mocks:
const checkboxGroupPreviewId = 'CheckboxGroupPreview';
jest.mock('./CheckboxGroupPreview', () => ({
  CheckboxGroupPreview: () => <div data-testid={checkboxGroupPreviewId} />
}));
const radioGroupPreviewId = 'RadioGroupPreview';
jest.mock('./RadioGroupPreview', () => ({
  RadioGroupPreview: () => <div data-testid={radioGroupPreviewId} />
}));

describe('ComponentPreview', () => {
  afterEach(jest.resetAllMocks);

  it('Renders CheckboxGroupPreview when component type is Checkboxes', () => {
    const checkboxesComponent: IFormCheckboxComponent = {
      ...component,
      options: [],
      optionsId: '1',
      type: ComponentTypes.Checkboxes,
    };
    render({ component: checkboxesComponent });
    expect(screen.getByTestId(checkboxGroupPreviewId)).toBeInTheDocument();
  });

  it('Renders RadioGroupPreview when component type is RadioButtons', () => {
    const radiosComponent: IFormRadioButtonComponent = {
      ...component,
      options: [],
      optionsId: '1',
      type: ComponentTypes.RadioButtons,
    };
    render({ component: radiosComponent });
    expect(screen.getByTestId(radioGroupPreviewId)).toBeInTheDocument();
  });

  it.each([
    ComponentTypes.AddressComponent,
    ComponentTypes.AttachmentList,
    ComponentTypes.Button,
    ComponentTypes.Datepicker,
    ComponentTypes.Dropdown,
    ComponentTypes.FileUpload,
    ComponentTypes.FileUploadWithTag,
    ComponentTypes.Group,
    ComponentTypes.Header,
    ComponentTypes.Image,
    ComponentTypes.Input,
    ComponentTypes.NavigationBar,
    ComponentTypes.NavigationButtons,
    ComponentTypes.Map,
    ComponentTypes.Panel,
    ComponentTypes.Paragraph,
    ComponentTypes.TextArea,
    ComponentTypes.ThirdParty,
  ])('Renders error text when component type is %s', (type: ComponentTypes) => {
    render({ component: {...component, type} });
    expect(screen.getByText('Forhåndsvisning er ikke implementert for denne komponenten.')).toBeInTheDocument();
  });
});

const render = (props: Partial<ComponentPreviewProps> = {}) =>
  renderRtl(<ComponentPreview {...defaultProps} {...props} />);
