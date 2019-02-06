import { Selector, t } from 'testcafe';

export default class DashBoard {
  constructor() {
    //New service dialogue box
    this.newServiceButton = Selector("button > span").withExactText("ny tjeneste");
    this.tjenesteEier = Selector("#service-owner");
    this.tjenesteNavn = Selector("#service-name");
    this.lagringsNavn = Selector("#service-saved-name");
    this.opprettButton = Selector("button").withExactText("Opprett");
  }

  async createNewService(serviceName) {
    //New service button and dialogue selectors
  }
}