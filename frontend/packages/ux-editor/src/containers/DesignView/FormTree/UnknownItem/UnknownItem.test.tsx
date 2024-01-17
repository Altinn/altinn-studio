import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { UnknownReferencedItem, UnknownReferencedItemProps } from './UnknownItem';
import { layoutMock } from '../../../../testing/layoutMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { useDeleteUnknownComponentReference } from './useDeleteUnknownComponentReference';

jest.mock('./useDeleteUnknownComponentReference');

const mockUseUpdateFormContainerMutation =
  useDeleteUnknownComponentReference as jest.MockedFunction;

describe('UnknownReferencedItem', () => {
  it('should display unknown reference component with help text', async () => {
    const user = userEvent.setup();

    renderUnknownReferencedItem({
      id: 'unknown-component-reference',
      layout: layoutMock,
    });

    const helpTextButton = screen.getByRole('button', {
      name: textMock('ux_editor.unknown_group_reference_help_text_title'),
    });

    await act(() => user.click(helpTextButton));

    expect(screen.getByText('unknown-component-reference'));
    expect(
      screen.getByText(
        textMock('ux_editor.unknown_group_reference', {
          id: 'unknown-component-reference',
        }),
      ),
    );
  });

  it('should delete reference when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockedDelete = jest.fn();
    mockUseUpdateFormContainerMutation.mockReturnValue(mockedDelete);
    renderUnknownReferencedItem({
      id: 'unknown',
      layout: layoutMock,
    });

    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    expect(mockedDelete).toHaveBeenCalled();
  });
});

const renderUnknownReferencedItem = (props: UnknownReferencedItemProps) => {
  return render(<UnknownReferencedItem id={props.id} layout={props.layout} />);
};
