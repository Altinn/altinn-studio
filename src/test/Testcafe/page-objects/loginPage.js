import { Selector, t } from 'testcafe';


export default class LoginPage {
  constructor() {
    this.welcomeLoginButton = Selector('input');
    this.userInput = Selector('#user_name');
    this.passwordInput = Selector('#password');
    this.loginButton = Selector('button');
  }

}