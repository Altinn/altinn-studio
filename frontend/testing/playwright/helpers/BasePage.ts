import { Routes } from "./Routes";
import { Page } from "@playwright/test";

export class BasePage extends Routes  {
    public readonly _page: Page;
    constructor(private page: Page) {
        super();
        this._page = this.page;
    }
}
