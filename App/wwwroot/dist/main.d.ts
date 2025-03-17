import { LitElement } from "lit";
export declare class CustomSigneeList extends LitElement {
    static styles: import("lit").CSSResult;
    org: string;
    private _signees;
    connectedCallback(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}
