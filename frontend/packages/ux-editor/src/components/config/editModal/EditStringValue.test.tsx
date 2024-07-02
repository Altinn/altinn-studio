import React from 'react';
import { screen } from '@testing-library/react';

import { EditStringValue } from './EditStringValue';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const renderEditStringValue = ({ maxLength = undefined, handleComponentChange = jest.fn() } = {}) =>
  renderWithProviders(
    <EditStringValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength: maxLength || '',
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: 'some-path' },
      }}
    />,
  );

describe('EditStringValue', () => {
  it('should render', () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange });
  });

  it(' Ensure that the onChange handler is called with the correct arguments', async () => {
    const handleComponentChange = jest.fn();
    renderEditStringValue({ handleComponentChange });
    const inputElement = screen.getByLabelText(
      textMock('ux_editor.component_properties.maxLength'),
    );
    await user.type(inputElement, 'new value');
    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 'new value',
      itemType: 'COMPONENT',
      dataModelBindings: { simpleBinding: 'some-path' },
    });
  });
});
