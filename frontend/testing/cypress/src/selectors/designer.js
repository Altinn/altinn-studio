import * as texts from '@altinn-studio/language/src/nb.json';
import * as testids from '../../../testids';

const getToolbarItems = () => cy.findAllByTestId(testids.draggableToolbarItem);

export const designer = {
  getAddPageButton: () => cy.findByRole('button', { name: texts['ux_editor.pages_add'] }),
  getDroppableList: () => cy.findByTestId(testids.droppableList),
  getPageHeaderButton: (page) => cy.findByRole('button', { name: `${page}` }),
  getPageAccordionByName: (page) => cy.findByTestId(testids.pageAccordionContent(page)),
  getToolbarItemByText: (text) => getToolbarItems().findByText(text),
  getToolbarItems,
};
