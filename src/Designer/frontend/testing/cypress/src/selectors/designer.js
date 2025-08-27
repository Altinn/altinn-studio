import * as texts from 'src/Designer/frontend/language/src/nb.json';
import { draggableToolbarItem, droppableList } from '../../../testids';

const getToolbarItems = () => cy.findAllByTestId(draggableToolbarItem);

export const designer = {
  getAddPageButton: () => cy.findByRole('button', { name: texts['ux_editor.pages_add'] }),
  getDroppableList: () => cy.findByTestId(droppableList),
  getToolbarItemByText: (text) => getToolbarItems().findByText(text),
  getToolbarItems,
};
