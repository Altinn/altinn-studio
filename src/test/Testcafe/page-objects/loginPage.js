import { Selector, t } from 'testcafe';



export default class loginPage {
    constructor () {
        //repository landing page
        this.userInput = Selector('#user_name');
        this.passwordInput = Selector('#password');
        this.loginButton = Selector('#body > div > div.user.signin > div.ui.container > div > form > div:nth-child(5) > button');
        }
    
    async login (username,password,landingPage) {
        await t
            .typeText(this.userInput, username)
            .typeText(this.passwordInput, password)
            .click(this.loginButton);
    }
}
