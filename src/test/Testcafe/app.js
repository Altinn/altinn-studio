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
