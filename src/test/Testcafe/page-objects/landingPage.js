import { Selector, t } from 'testcafe';

export default class landingPage () { 
    constructor () { 
        this.altinnHeader = Selector('body > div > div.text-center > h1 > span')
        this.repoLink = Selector('body > div > div.row.no-gutters > div > a')
        this.createButton = Selector('.div.right.stackable.menu');    
        this.newRepoButton = createButton.find("fitted octicon octicon-plus");
    }
}