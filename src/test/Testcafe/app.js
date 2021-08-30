import config from './config';
import process from 'process';

let instance = null;

export default class App {
  constructor() {
    if (!instance) {
      instance = this;
      this.initialized = false;
      this.activeFixturesCount = 0;
      let environment = process.env.ENV.toLowerCase();
      this.baseUrl = config[environment].baseUrl;
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
