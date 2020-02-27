import { Role } from 'testcafe'
import App from './app';
import LoginPage from './page-objects/loginPage';
import config from './config';

let app = new App();
let loginPage = new LoginPage();
let environment = process.env.ENV;

//Role for an user who has rights to deploy an app to a test environment
export const AutoTestUser = Role(app.baseUrl, async t => {
  var userName = config[environment].autoTestUser;

  //Get password from environments
  var password= process.env.autoTestUserPwd.toString();  

  //Login to Studio with an user who has all rights for the apps under an Org
  await t
      .click(loginPage.welcomeLoginButton)
      .expect(loginPage.userInput.exists).ok({timeout: 30000})
      .typeText(loginPage.userInput, userName)
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton)
}, { preserveUrl: true })

//Role for an user who does not have rights to deploy an app to a test environment
export const NoDeployUser = Role(app.baseUrl, async t => {  
  var userName = config[environment].noDeployUser;

  //Get password from environments with quotes and remove the quotes
  var password= process.env.noDeployUserPwd.toString();
  var passwordLength = password.length;
  password = password.substring(1, passwordLength-1);  

  //Login to Studio with an user without access to app deploy
  await t
      .click(loginPage.welcomeLoginButton)
      .expect(loginPage.userInput.exists).ok({timeout: 30000})
      .typeText(loginPage.userInput, userName)
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton)
}, { preserveUrl: true })