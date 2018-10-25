import { Selector } from 'testcafe';

const userName = Selector('#user_name');
const password = Selector('#password');
const signIn = Selector('body > div > div.user.signin > div.ui.container > div > form > div:nth-child(5) > button');
const repoLink = Selector('body > div > div.row.no-gutters > div > a')
const createRepo = Selector('#navbar > div.right.stackable.menu > div:nth-child(2) > div > a:nth-child(1)')

fixture('Loggin in')
    .page `http://altinn3.no/`;

test('Login and create new repo', async t => {
    await t
        .doubleClick(userName)
        .typeText(userName, 'extten@brreg.no')
        .doubleClick(password)
        .typeText(password, 'Cumulus212')
        .click(signIn);

    const altinnHeader = await Selector('body > div > div.text-center > h1 > span')
        .with({visibilityCheck: true})
        .nth(0);
    await t
        .expect(altinnHeader.exists).ok({timeout: 2500})
        .expect(altinnHeader.innerText).eql('Altinn studio')
        .click(repoLink)
        .click(createRepo)
});