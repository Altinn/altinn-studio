import { Selector, t } from 'testcafe';

export default class DashBoard {
  constructor() {
    //New app dialogue box
    this.homeButton = Selector("img").withAttribute("title", "startside");
    this.profileButton = Selector("ul > li > a > i").withExactText("AutoTest");
    this.logoutButton = Selector(".dropdown-item").withText("Logg ut");
    this.newAppButton = Selector("button > span").withExactText("ny app");
    this.appSearch = Selector("#service-search");
    this.tjenesteEier = Selector("#service-owner");    
    this.appName = Selector("#service-saved-name");
    this.rettigheterMelding = Selector("p").withText("Du har ikke tilgang");
    this.skriveRettigheter = Selector("div > div > p").withText("Du har ikke skriverettigheter");
    this.opprettButton = Selector("button").withExactText("Opprett");
    this.appExistsDialogue = Selector("div").withExactText("En app med det navnet finnes allerede.");
    this.appOwnerList = Selector('#menu-').find('li').withAttribute('role','option');
  }

  async logout() {
    await t
      .hover(this.homeButton)
      .click(this.logoutButton)
  }
}