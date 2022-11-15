//Selectors in dashboard
export const dashboard = {
  newApp: "[data-testid='dashboard.new_app']",
  appOwners: '#service-owner',
  appName: '#service-saved-name',
  button: 'button',
  createApp: 'Opprett applikasjon',
  appOwnersList: "li[role='option']",
  searchApp: '#search-repos',
  apps: {
    name: "div[data-field='name']",
    createdBy: "div[data-field='owner.created_by']",
    updatedAt: "div[data-field='updated_at']",
    links: "div[data-field='links']",
    favourite: "button[id*='fav-repo']",
    edit: "[data-testid='edit-repo-link']",
    previousPage: '[data-testid=KeyboardArrowLeftIcon]',
    nextPage: '[data-testid=KeyboardArrowRightIcon]',
    sortUp: '[data-testid=ArrowUpwardIcon]',
    sortDown: '[data-testid=ArrowDownwardIcon]',
  },
};
