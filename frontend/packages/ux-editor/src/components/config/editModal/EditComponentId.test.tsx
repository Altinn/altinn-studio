import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import type { IEditComponentId } from './EditComponentId';
import { EditComponentId } from './EditComponentId';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';

const studioRender = async (props: Partial<IEditComponentId>) => {
  return renderWithMockStore({})(
    <EditComponentId
      component={{
        id: 'test',
        type: ComponentType.Input,
        ...props.component,
      }}
      handleComponentUpdate={jest.fn()}
      helpText={'test'}
      {...props}
    />,
  );
};

describe('EditComponentId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with test id ', async () => {
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    expect(testIdButton).toBeInTheDocument();
  });

  it('should render textField with komponent-id when user click the button', async () => {
    const user = userEvent.setup();
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    expect(textField).toBeInTheDocument();
  });

  it('when user in edit mode and click outside the textfield, the textfield should disappear', async () => {
    const user = userEvent.setup();
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await act(() => user.click(document.body));
    expect(textField).not.toBeInTheDocument();
  });
});
