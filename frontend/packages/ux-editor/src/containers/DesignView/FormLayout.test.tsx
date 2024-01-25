import React from 'react';
import type { FormLayoutProps } from './FormLayout';
import { FormLayout } from './FormLayout';
import { layoutMock } from '../../testing/layoutMock';
import { screen } from '@testing-library/react';
import { renderWithMockStore } from '../../testing/mocks';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { FormContextProvider } from '../FormContext';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { internalLayoutWithMultiPageGroup } from '../../testing/layoutWithMultiPageGroupMocks';

const defaultProps: FormLayoutProps = {
  layout: layoutMock,
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
});

const render = (props?: Partial<FormLayoutProps>) =>
  renderWithMockStore()(
    <DragAndDropTree.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormContextProvider>
        <FormLayout {...defaultProps} {...props} />
      </FormContextProvider>
    </DragAndDropTree.Provider>,
  );
