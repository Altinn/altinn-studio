export type PageModel = {
  id: string;
};

export enum GroupType {
  Data = undefined,
  Info = 'info',
}

export type GroupModel = {
  name?: string;
  order: PageModel[];
  type?: GroupType;
  markWhenCompleted?: boolean;
};
