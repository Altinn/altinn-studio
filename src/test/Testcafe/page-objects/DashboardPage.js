import { Selector, t } from 'testcafe';

export default class DashBoard {
  constructor() {
    //New service dialogue box
    this.homeButton = Selector("img").withAttribute("title", "startside");
    this.profileButton = Selector("ul > li > a > i").withExactText("AutoTest");
    this.logoutButton = Selector(".dropdown-item").withText("Logg ut");
    this.newServiceButton = Selector("button > span").withExactText("ny tjeneste");
    this.serviceSearch = Selector("#service-search");
    this.tjenesteEier = Selector("#service-owner");
    this.tjenesteNavn = Selector("#service-name");
    this.lagringsNavn = Selector("#service-saved-name");
    this.rettigheterMelding = Selector("p").withText("Du har ikke tilgang");
    this.skriveRettigheter = Selector("div > div > p").withText("Du har ikke skriverettigheter");
    this.opprettButton = Selector("button").withExactText("Opprett");
    this.serviceExistsDialogue = Selector("div").withExactText("Lagringsnavnet finnes allerede");
    this.serviceOwnerList = Selector('#menu-').find('li').withAttribute('role','option');
  }

  async logout() {
    await t
      .hover(this.homeButton)
      .click(this.logoutButton)
  }
}