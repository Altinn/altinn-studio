import React from 'react';
import { screen } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithMockStore } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormRadioButtonsComponent } from '../../../types/FormComponent';

const mockComponent: FormRadioButtonsComponent = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};

const renderEditOptions = ({ component = mockComponent, handleComponentChange = jest.fn() } = {}) =>
  renderWithMockStore()(
    <EditOptions handleComponentChange={handleComponentChange} component={component} />,
  );

describe('EditOptions', () => {
  it('should render', () => {
    renderEditOptions();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_add_radio_button_options')),
    ).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', async () => {
    renderEditOptions();
    expect(screen.getByText(textMock('ux_editor.modal_add_options_codelist'))).toBeInTheDocument();
  });

  it('should show manual input when component has options defined', async () => {
    renderEditOptions({
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    expect(screen.getByText(textMock('ux_editor.modal_add_options_manual'))).toBeInTheDocument();
  });

  it('should show code list input when component has optionsId defined', async () => {
    renderEditOptions({
      component: {
        ...mockComponent,
        optionsId: 'optionsId',
      },
    });
    expect(screen.getByText(textMock('ux_editor.modal_add_options_manual'))).toBeInTheDocument();
  });
});
