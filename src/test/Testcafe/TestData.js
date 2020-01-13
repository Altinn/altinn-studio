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

export const AutoTestUser = Role(app.baseUrl, async t => {
  var password= process.env.autoTestPwd.toString();
  var passwordLength = password.length;
  password = password.substring(1, passwordLength-1);
  await t
      .click(loginPage.welcomeLoginButton)
      .expect(loginPage.userInput.exists).ok({timeout: 30000})
      .typeText(loginPage.userInput, "AutoTest")
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton)
}, { preserveUrl: true })

export const NoDeployUser = Role(app.baseUrl, async t => {  
  var password= process.env.automatedTestPwd.toString();
  var passwordLength = password.length;
  password = password.substring(1, passwordLength-1);
  await t
      .click(loginPage.welcomeLoginButton)
      .expect(loginPage.userInput.exists).ok({timeout: 30000})
      .typeText(loginPage.userInput, "automatedtest@email.com")
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton)
}, { preserveUrl: true })