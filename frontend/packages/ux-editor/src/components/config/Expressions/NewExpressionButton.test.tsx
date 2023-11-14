import React from 'react';
import { act, screen } from '@testing-library/react';
import { NewExpressionButton, NewExpressionButtonProps } from './NewExpressionButton';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
const optionsMock = [
  { label: 'some label', value: 'some-value' },
  { label: 'default label', value: 'default' },
];

describe('NewExpressionButton', () => {
  afterEach(jest.clearAllMocks);

  it('renders add expression button by default', () => {
    render({});

    const addButton = screen.getByText(textMock('right_menu.expressions_add'));

    expect(addButton).toBeInTheDocument();
  });

  it('renders dropdown when button is clicked', async () => {
    render({});

    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await act(() => user.click(addButton));
    const dropdown = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_property'),
    });
    expect(dropdown).toBeInTheDocument();
  });

  it('calls onAddExpression when an option is selected', async () => {
    const onAddExpressionMock = jest.fn();
    render({
      props: {
        onAddExpression: onAddExpressionMock,
      },
    });

    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await act(() => user.click(addButton));
    const dropdown = screen.getByRole('combobox', {
      name: textMock('right_menu.expressions_property'),
    });
    await act(() => user.click(dropdown));
    const dropdownOption = screen.getByRole('option', { name: optionsMock[0].label });
    await act(() => user.click(dropdownOption));

    expect(onAddExpressionMock).toHaveBeenCalledWith(optionsMock[0].value);
    expect(onAddExpressionMock).toHaveBeenCalledTimes(1);
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<NewExpressionButtonProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: NewExpressionButtonProps = {
    options: optionsMock,
    onAddExpression: jest.fn(),
  };
  return renderWithMockStore({}, queries)(<NewExpressionButton {...defaultProps} {...props} />);
};
