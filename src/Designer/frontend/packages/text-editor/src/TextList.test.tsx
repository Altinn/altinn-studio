import userEvent from '@testing-library/user-event';
import type { TextListProps } from './TextList';
import { TextList } from './TextList';
import { screen, render as rtlRender } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { TextTableRow } from './types';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { textRowsPerPage } from './constants';

const textKey1: string = 'a';

const renderTextList = (props: Partial<TextListProps> = {}) => {
  const resourceRows: TextTableRow[] = [
    {
      textKey: textKey1,
      translations: [
        {
          lang: 'nb',
          translation: 'value1',
        },
      ],
    },
    {
      textKey: 'b',
      translations: [
        {
          lang: 'nb',
          translation: 'value2',
        },
      ],
    },
    {
      textKey: 'c',
      translations: [
        {
          lang: 'nb',
          translation: 'value3',
        },
      ],
    },
    {
      textKey: 'd',
      translations: [
        {
          lang: 'nb',
          translation: 'value4',
        },
      ],
    },
  ];

  const allProps: TextListProps = {
    resourceRows,
    searchQuery: undefined,
    updateEntryId: (_arg) => undefined,
    removeEntry: (_arg) => undefined,
    upsertTextResource: (_entry) => undefined,
    selectedLanguages: ['nb', 'en', 'nn'],
    ...props,
  };
  queryClientMock.setQueryData([QueryKey.LayoutNames, org, app], []);
  return {
    initPros: allProps,
    ...rtlRender(
      <ServicesContextProvider {...queriesMock} client={queryClientMock}>
        <TextList {...allProps} />
      </ServicesContextProvider>,
    ),
  };
};

describe('TextList', () => {
  it('should call updateEntryId when the ID is changed in the edit mode', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const { rerender, initPros } = renderTextList({ updateEntryId });
    queryClientMock.setQueryData([QueryKey.LayoutNames, org, app], []);
    rerender(
      <ServicesContextProvider {...queriesMock} client={queryClientMock}>
        <TextList {...initPros} />
      </ServicesContextProvider>,
    );

    const toggleEditButton = screen.getAllByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey: textKey1 }),
    });
    await user.click(toggleEditButton[0]);
    const idInput = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey: textKey1 }),
    });

    await user.dblClick(idInput);
    await user.keyboard('a-updated{TAB}');
    expect(updateEntryId).toHaveBeenCalledWith({ newId: 'a-updated', oldId: 'a' });
  });

  it('should display warnings for existing, empty, or space-containing IDs', async () => {
    const user = userEvent.setup();
    const updateEntryId = jest.fn();
    const [firstErrorMessage, secondErrorMessage, thirdErrorMessage]: string[] = [
      textMock('text_editor.key.error_duplicate'),
      textMock('text_editor.key.error_invalid'),
      textMock('text_editor.key.error_empty'),
    ];
    const { rerender, initPros } = renderTextList({ updateEntryId });
    queryClientMock.setQueryData([QueryKey.LayoutNames, org, app], []);
    rerender(
      <ServicesContextProvider {...queriesMock} client={queryClientMock}>
        <TextList {...initPros} />
      </ServicesContextProvider>,
    );

    const toggleEditButton = screen.getAllByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey: textKey1 }),
    });
    await user.click(toggleEditButton[0]);

    const idInput = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey: textKey1 }),
    });
    await user.dblClick(idInput);

    await user.keyboard('b');
    expect(screen.getByText(firstErrorMessage)).not.toBeNull();

    await user.clear(idInput);
    await user.keyboard('B');
    expect(screen.getByText(firstErrorMessage)).not.toBeNull();

    await user.keyboard('2');
    expect(screen.queryByText(firstErrorMessage)).toBeNull();

    await user.keyboard(' ');
    expect(screen.getByText(secondErrorMessage)).not.toBeNull();

    await user.clear(idInput);
    expect(screen.getByText(thirdErrorMessage)).not.toBeNull();

    await user.keyboard('{TAB}');
    expect(updateEntryId).not.toHaveBeenCalled();

    //Back to the original value, no error should be displayed
    await user.type(idInput, 'a');
    expect(screen.queryByText(firstErrorMessage)).toBeNull();
    expect(screen.queryByText(secondErrorMessage)).toBeNull();
    expect(screen.queryByText(thirdErrorMessage)).toBeNull();

    await user.keyboard('2{TAB}');
    expect(updateEntryId).toHaveBeenCalledWith({ oldId: 'a', newId: 'a2' });
  });

  describe('pagination', () => {
    const manyResourceRows: TextTableRow[] = Array.from(
      { length: textRowsPerPage * 2 },
      (_, index) => ({
        textKey: `key-${index}`,
        translations: [{ lang: 'nb', translation: `value-${index}` }],
      }),
    );

    it('renders one page of rows at a time and moves to the page the user selects', async () => {
      const user = userEvent.setup();
      renderTextList({ resourceRows: manyResourceRows, selectedLanguages: ['nb'] });

      expect(screen.getAllByRole('row')).toHaveLength(textRowsPerPage + 1);
      expect(screen.getByText('key-0')).toBeInTheDocument();
      expect(screen.queryByText(`key-${textRowsPerPage}`)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: `${textMock('general.page')} 2` }));

      expect(screen.getByText(`key-${textRowsPerPage}`)).toBeInTheDocument();
      expect(screen.queryByText('key-0')).not.toBeInTheDocument();
    });

    it('does not render pagination when all rows fit on one page', () => {
      renderTextList();

      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });
  });
});
