import type {
  ILayout,
  ILayoutComponentOrGroup,
  ILayoutGroup,
} from 'src/features/form/layout';

export const mapGroupComponents = (
  { children, edit }: ILayoutGroup,
  layout: ILayout | undefined | null,
) =>
  children
    .map((child) => {
      const childId = (edit?.multiPage && child.split(':')[1]) || child;
      return layout && layout.find((c) => c.id === childId);
    })
    .filter((c) => c !== undefined && c !== null) as ILayoutComponentOrGroup[];
