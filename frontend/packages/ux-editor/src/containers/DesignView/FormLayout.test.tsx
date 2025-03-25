import React from 'react';
import type { FormLayoutProps } from './FormLayout';
import { FormLayout } from './FormLayout';
import { layoutMock } from '../../testing/layoutMock';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { StudioDragAndDropTree } from '@studio/components-legacy';
import { FormItemContextProvider } from '../FormItemContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { internalLayoutWithMultiPageGroup } from '../../testing/layoutWithMultiPageGroupMocks';

const defaultProps: FormLayoutProps = {
  layout: layoutMock,
  isInvalid: false,
};

describe('FormLayout', () => {
  it('Does display a tree view component', () => {
    render();
    expect(screen.getByRole('tree'));
  });

  it('Displays warning about multi page groups when the layout has such groups', () => {
    render({ layout: internalLayoutWithMultiPageGroup });
    expect(screen.getByText(textMock('ux_editor.multi_page_warning'))).toBeInTheDocument();
  });

  it('Does not display warning about multi page groups when the layout does not have such groups', () => {
    render();
    expect(screen.queryByText(textMock('ux_editor.multi_page_warning'))).not.toBeInTheDocument();
  });

  it('Displays warning about duplicated ids when the layout has such ids', () => {
    const layoutWithDuplicatedIds = {
      ...layoutMock,
      order: {
        ['idContainer']: ['idContainer1', 'idContainer2', 'idContainer3'],
        ['idContainer1']: ['idContainer1', 'idContainer2', 'idContainer2'],
      },
    };

    render({ layout: layoutWithDuplicatedIds, isInvalid: true });

    expect(
      screen.getByText(textMock('ux_editor.formLayout.warning_duplicates')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.formLayout.warning_duplicates.cannot_publish')),
    ).toBeInTheDocument();

    const duplicatedIds = screen.getByText(/idContainer1, idContainer2/i);
    expect(duplicatedIds).toBeInTheDocument();

    const uniqueIds = screen.queryByText(/idContainer3/i);
    expect(uniqueIds).not.toBeInTheDocument();
  });
});

const render = (props?: Partial<FormLayoutProps>) =>
  renderWithProviders(
    <StudioDragAndDropTree.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormItemContextProvider>
        <FormLayout {...defaultProps} {...props} />
      </FormItemContextProvider>
    </StudioDragAndDropTree.Provider>,
  );
