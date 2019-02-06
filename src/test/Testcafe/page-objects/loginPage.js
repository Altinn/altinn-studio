import { Selector, t } from 'testcafe';


export default class LoginPage {
  constructor() {
    //repository landing page
    this.welcomeLoginButton = Selector('[value ^= "Logg inn"]');
    this.userInput = Selector('#user_name');
    this.passwordInput = Selector('#password');
    this.loginButton = Selector('.button').withExactText('Logg inn');
  }

}