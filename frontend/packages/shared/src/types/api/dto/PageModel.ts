export type PageModel = {
  id: string;
};

export type GroupModel = {
  name?: string;
  order: PageModel[];
  type?: string;
  markWhenCompleted?: boolean;
};
