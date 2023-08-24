import * as texts from "@altinn-studio/language/src/nb.json";
import * as testids from "../../../testids";

const getToolbarItems = () => cy.findAllByTestId(testids.draggableToolbarItem);

export const designer = {
  getAddPageButton: () =>
    cy.findByRole("button", { name: texts["left_menu.pages_add"] }),
  getDroppableList: () => cy.findByTestId(testids.droppableList),
  getToolbarItemByText: (text) => getToolbarItems().findByText(text),
  getToolbarItems,
};
