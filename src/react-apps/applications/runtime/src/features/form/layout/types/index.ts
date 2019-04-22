export interface ILayoutEntry {
  id: string;
  type: string;
}

export interface ILayoutContainer extends ILayoutEntry {
  children: [ILayoutContainer | ILayoutComponent];
}

export interface ILayoutComponent extends ILayoutEntry {
  dataModelBinding: string;
  hidden: boolean;
  readOnly: boolean;
  title: string;
}

export type ILayout = [ILayoutComponent | ILayoutContainer];
