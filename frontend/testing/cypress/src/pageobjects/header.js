//Selectors in header of studio common to all pages
export const header = {
  profileIcon: '#profile-icon-button',
  profileIconDesigner: "img[aria-label*='profilikon']",
  profileIconName: 'profilikon',
  menu: {
    item: '[role="menuitem"]',
    all: '#menu-all',
    self: '#menu-self',
    org: (orgUserName) => (orgUserName ? `[id='menu-org-${orgUserName}']` : "[id='menu-org*']"),
    gitea: '#menu-gitea',
    logOut: '#menu-logout',
    openRepo: 'a[href*="repos"]',
    appRepoLinkName: 'Åpne repository',
    docs: 'a[href="https://docs.altinn.studio/"]',
  },
};
