//Selectors in dashboard
export const dashboard = {
  newApp: '#createService',
  appOwners: '#service-owner',
  appName: '#service-saved-name',
  button: 'button',
  createApp: 'Opprett',
  appOwnersList: "li[role='option']",
  closeButton: '.ai-exit-test',
  searchApp: '#search-repos',
  apps: {
    name: "div[data-field='name']",
    createdBy: "div[data-field='owner.created_by']",
    updatedAt: "div[data-field='updated_at']",
    links: "div[data-field='links']",
    favorite: "button[id*='fav-repo']",
    edit: "a[href*='/designer/']",
    previousPage: '[data-testid=KeyboardArrowLeftIcon]',
    nextPage: '[data-testid=KeyboardArrowRightIcon]',
    sortUp: '[data-testid=ArrowUpwardIcon]',
    sortDown: '[data-testid=ArrowDownwardIcon]',
  },
};
