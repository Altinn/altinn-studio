import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';

export const mapGroupComponents = (
  { children, edit }: ILayoutGroup,
  layout: ILayout,
) =>
  children.map((child) => {
    const childId = (edit?.multiPage && child.split(':')[1]) || child;
    return layout.find((c) => c.id === childId) as ILayoutComponent;
  });
