import React from 'react';
import { screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { UnknownReferencedItemProps } from './UnknownReferencedItem';
import { UnknownReferencedItem } from './UnknownReferencedItem';
import { layoutMock } from '../../../../testing/layoutMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../testing/mocks';

describe('UnknownReferencedItem', () => {
  it('should display unknown reference component with help text', async () => {
    const user = userEvent.setup();

    renderUnknownReferencedItem({
      props: {
        id: 'unknown-component-reference',
        layout: layoutMock,
      },
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
    const mockedSaveFormLayout = jest.fn().mockImplementation(() => Promise.resolve());
    renderUnknownReferencedItem({
      props: {
        id: 'unknown',
        layout: layoutMock,
      },
      queries: {
        saveFormLayout: mockedSaveFormLayout,
      },
    });

    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    expect(mockedSaveFormLayout).toHaveBeenCalled();
  });
});

type RenderUnknownReferencedItem = {
  props: UnknownReferencedItemProps;
  queries?: Partial<ServicesContextProps>;
};
const renderUnknownReferencedItem = ({ props, queries = {} }: RenderUnknownReferencedItem) => {
  return renderWithMockStore(
    {},
    { ...queries },
  )(<UnknownReferencedItem id={props.id} layout={props.layout} />);
};
