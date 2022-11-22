import {repoDownloadPath} from "./api-paths";


test("that params works as intende",()=>{
    const url = repoDownloadPath("org","app", true);
    expect(url.endsWith("full=true")).toBeTruthy();
});

