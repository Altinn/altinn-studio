import { Selector, t } from 'testcafe';


export default class LoginPage {
  constructor() {
    //repository landing page
    this.userInput = Selector('#user_name');
    this.passwordInput = Selector('#password');
    this.loginButton = Selector('#body > div > div.user.signin > div.ui.container > div > form > div:nth-child(5) > button');
  }

}