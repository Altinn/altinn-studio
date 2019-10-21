import { Selector } from 'testcafe';
import config from './config';
import minimist from 'minimist'; //argument parsing
import process from 'process';

let instance = null;

export default class App {
  constructor() {
    if (!instance) {
      instance = this;
      this.initialized = false;
      this.activeFixturesCount = 0;
      //let { env } = minimist(process.argv.slice(2));
      this.baseUrl = config["dev"].baseUrl;
      //can use params here
      this.userInput = Selector('#user_name');
      this.passwordInput = Selector('#password');
      this.loginButton = Selector(".user.signin").withText("log in");
    }
    return instance;
  }

  async before() {
    if (!this.initialized) {
      this.initialized = true;
      //do some initializing here
    }

    this.activeFixturesCount++;
  }

  async after() {
    this.activeFixturesCount--;
    if (!this.activeFixturesCount) {
      //place teardown code here
    }
  }
}
