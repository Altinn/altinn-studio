import { Role } from 'testcafe';
import App from './app';
import LoginPage from './page-objects/loginPage';
import config from './config';

let app = new App();
let loginPage = new LoginPage();
let environment = process.env.ENV.toLowerCase();

//Role for an user who has rights to deploy an app to a test environment
export const AutoTestUser = Role(
  app.baseUrl,
  async (t) => {
    var userName = config[environment].autoTestUser;
    var password = process.env.autoTestUserPwd.toString();
    await loginPage.login(userName, password);
  },
  { preserveUrl: true },
);

//Role for an user who does not have rights to deploy an app to a test environment
export const NoDeployUser = Role(
  app.baseUrl,
  async (t) => {
    var userName = config[environment].noDeployUser;
    var password = process.env.noDeployUserPwd.toString();
    await loginPage.login(userName, password);
  },
  { preserveUrl: true },
);

//Role for an user used for bruksmønster tests
export const UseCaseUser = Role(
  app.baseUrl,
  async (t) => {
    var userName = config[environment].useCaseUser;
    var password = process.env.useCaseUserPwd.toString();
    await loginPage.login(userName, password);
  },
  { preserveUrl: true },
);
