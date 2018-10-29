import { Selector, t } from 'testcafe';

export default class commonPage { 
    constructor () {
        this.repoLogoutButton = Selector("#navbar > div.right.stackable.menu > div.ui.dropdown.jump.item.poping.up.active.visible > div > a:nth-child(10)");
        this.designerLogoutButton = Selector("#navbarSupportedContent > ul:nth-child(2) > li > div > a:nth-child(4)");
    }

    async login (username,password,landingPage) {
        await t
            .typeText(this.userInput, username)
            .typeText(this.passwordInput, password)
            .click(this.loginButton);
    }

    async repoLogout () {      
        if (this.repoLogoutButton.exists) {
            await t
                t.click(this.repologoutButton);
        } else {
            await t
                t.click(this.designerLogoutButton);
        }

        const signInElement = '.signin';
        const selector = Selector(signInElement)
            .find('option')
            .withExactText('Sign In');
        await t
            .expect(selector.exists)
            .ok({timeout: 5000});
    }
}