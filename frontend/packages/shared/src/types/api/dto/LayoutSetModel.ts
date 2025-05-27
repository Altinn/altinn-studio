import type { TaskModel } from './TaskModel';

export type LayoutSetModel = {
  id: string;
  dataType: string;
  type: string;
  task?: TaskModel;
  pageCount?: number;
};
