import config from './config';
import minimist from 'minimist'; //argument parsing

let instance = null;

export default class App{
    constructor() {
        if(!instance){
            instance = this;
            this.initialized = false;
            this.activeFixturesCount = 0;
            let args = minimist(process.argv.slice(2));
            //can use params here
            this.baseUrl = config[args.env].baseUrl;
            this.userInput = Selector('#user_name');
            this.passwordInput = Selector('#password');
            this.loginButton = Selector('#body > div > div.user.signin > div.ui.container > div > form > div:nth-child(5) > button');    
        }
        return instance;
    }

    async before() {
        if(!this.initialized){
            this.initialized = true;
            //do some initializing here
        }

    this.activeFixturesCount++;
    }

    async after() {
        this.activeFixturesCount--;
        if(!this.activeFixturesCount)
        {
            //place teardown code here
        }
    }
}
