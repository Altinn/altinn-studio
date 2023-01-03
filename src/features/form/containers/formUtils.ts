import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayout } from 'src/layout/layout';

export const mapGroupComponents = ({ children, edit }: ILayoutGroup, layout: ILayout | undefined | null) =>
  children
    .map((child) => {
      const childId = (edit?.multiPage && child.split(':')[1]) || child;
      return layout && layout.find((c) => c.id === childId);
    })
    .filter((c) => c !== undefined && c !== null) as ComponentInGroup[];
