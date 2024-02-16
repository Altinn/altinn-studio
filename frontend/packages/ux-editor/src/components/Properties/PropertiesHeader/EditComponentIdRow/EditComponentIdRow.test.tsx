import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithMockStore } from '../../../../testing/mocks';
import { EditComponentIdRow, type EditComponentIdRowProps } from './EditComponentIdRow';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const studioRender = async (props: Partial<EditComponentIdRowProps>) => {
  return renderWithMockStore({})(
    <EditComponentIdRow
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

describe('EditComponentIdRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render button ', async () => {
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    expect(testIdButton).toBeInTheDocument();
  });

  it('should render textField when the button is clicked', async () => {
    const user = userEvent.setup();
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', {
      name: 'ID',
    });
    expect(textField).toBeInTheDocument();
  });

  it('should not render the textfield when changing from edit mode to view mode ', async () => {
    const user = userEvent.setup();
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', {
      name: 'ID',
    });
    await act(() => user.click(document.body));
    expect(textField).not.toBeInTheDocument();
  });

  it('should call onChange when user change the input in text filed.', async () => {
    const user = userEvent.setup();
    const handleComponentUpdate = jest.fn();
    await studioRender({ handleComponentUpdate });
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', {
      name: 'ID',
    });
    await act(() => user.type(textField, 'newTestId'));
    await act(() => user.click(document.body));
    expect(handleComponentUpdate).toHaveBeenCalled();
  });

  it('should show error requiered error message when id is empty', async () => {
    const user = userEvent.setup();
    await studioRender({});
    const testIdButton = screen.getByRole('button', { name: 'ID: test' });
    await act(() => user.click(testIdButton));
    const textField = screen.getByRole('textbox', { name: 'ID' });
    await act(() => user.clear(textField));
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });
});
