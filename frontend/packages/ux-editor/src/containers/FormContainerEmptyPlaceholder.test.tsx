import React from 'react';
import { screen } from '@testing-library/react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerEmptyPlaceholderProps } from './FormContainerEmptyPlaceholder';
import { FormContainerEmptyPlaceholder } from './FormContainerEmptyPlaceholder';
import { renderWithMockStore } from '../testing/mocks';
import { createMockedDndEvents } from './helpers/dnd-helpers.test';
import { textMock } from '../../../../testing/mocks/i18nMock';

describe('FormContainerEmptyPlaceholder', () => {
  it('should render the component', async () => {
    await render();

    expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();
  });
});

const render = async (props: Partial<IFormContainerEmptyPlaceholderProps> = {}) => {
  const allProps: IFormContainerEmptyPlaceholderProps = {
    containerId: 'test',
    dndEvents: createMockedDndEvents(),
    ...props
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainerEmptyPlaceholder {...allProps} />
    </DndProvider>
  );
};
