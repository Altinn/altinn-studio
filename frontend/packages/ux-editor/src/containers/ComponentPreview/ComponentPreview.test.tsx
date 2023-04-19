import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import { ComponentPreview, ComponentPreviewProps } from './ComponentPreview';
import {
  FormComponentType,
  IFormCheckboxComponent,
  IFormRadioButtonComponent,
} from '../../types/global';
import { ComponentType } from '../../components';

// Test data:
const component: FormComponentType = { id: '1', type: ComponentType.Input, itemType: 'COMPONENT' };
const handleComponentChange = jest.fn();
const defaultProps: ComponentPreviewProps = {
  component,
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
    const checkboxesComponent: IFormCheckboxComponent = {
      ...component,
      options: [],
      optionsId: '1',
      type: ComponentType.Checkboxes,
    };
    render({ component: checkboxesComponent });
    expect(screen.getByTestId(checkboxGroupPreviewId)).toBeInTheDocument();
  });

  it('Renders RadioGroupPreview when component type is RadioButtons', () => {
    const radiosComponent: IFormRadioButtonComponent = {
      ...component,
      options: [],
      optionsId: '1',
      type: ComponentType.RadioButtons,
    };
    render({ component: radiosComponent });
    expect(screen.getByTestId(radioGroupPreviewId)).toBeInTheDocument();
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
    render({ component: { ...component, type } });
    expect(
      screen.getByText('Forhåndsvisning er ikke implementert for denne komponenten.')
    ).toBeInTheDocument();
  });
});

const render = (props: Partial<ComponentPreviewProps> = {}) =>
  renderRtl(<ComponentPreview {...defaultProps} {...props} />);
