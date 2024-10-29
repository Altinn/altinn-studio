import {
  droppableListId as studioDroppableListId,
  draggableToolbarItemId as studioDdaggableToolbarItemId,
} from '@studio/components';

export const appContentWrapperId = 'app-content-wrapper';
export const dataModellingContainerId = 'data-modelling-container';
export const deleteButtonId = (key) => `delete-button-${key}`;
export const draggableToolbarItemId = studioDdaggableToolbarItemId;
export const droppableListId = studioDroppableListId;
export const orgMenuItemId = (orgUserName) =>
  orgUserName ? `menu-org-${orgUserName}` : 'menu-org-no-org-user-name';
export const resetRepoContainerId = 'reset-repo-container';
export const typeItemId = (pointer) => `type-item-${pointer}`;
export const userMenuItemId = 'user-menu-item';
export const pageAccordionContentId = (pageName) => `page-accordion-content-${pageName}`;
export const profileButtonId = 'profileButton';
export const org = 'testOrg';
export const app = 'testApp';
export const selectedLayoutSet = 'layout-set-test';
export const conditionalRenderingOutputFieldId = 'conditional-rendering-output-field';
export const conditionalRenderingDeleteButtonId = 'delete_field_button';
