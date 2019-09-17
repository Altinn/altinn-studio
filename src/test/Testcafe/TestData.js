import { Role } from 'testcafe'
import App from './app';
import LoginPage from './page-objects/loginPage';

let app = new App();
let loginPage = new LoginPage();

export default class TestData {
  constructor(userName, userEmail, password, role) {
    this.userName = userName;
    this.userEmail = userEmail;
    this.password = password;
    this.role = role;
  }
}

export const AutoTestUser = Role(app.baseUrl + 'Home/Index#/', async t => {
  await t
      .typeText(loginPage.userInput, "AutoTest")
      .typeText(loginPage.passwordInput, "test123")
      .click(loginPage.loginButton)
}, { preserveUrl: true })

export const NoDeployUser = Role(app.baseUrl +'Home/Index#/', async t => {
  await t
      .typeText(loginPage.userInput, "automatedtest@email.com")
      .typeText(loginPage.passwordInput, "test123")
      .click(loginPage.loginButton)
}, { preserveUrl: true })