export type PageModel = {
  id: string;
};

export type GroupModel = {
  name: string;
  pages: PageModel[];
  type?: string;
  markWhenCompleted?: boolean;
};
