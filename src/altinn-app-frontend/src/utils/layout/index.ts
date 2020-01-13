import { ILayout, ILayoutComponent } from '../../features/form/layout/';

export function getLayoutComponentById(id: string, layout: ILayout): ILayoutComponent {
  const component: ILayoutComponent = layout.find((element) => element.id === id) as ILayoutComponent;
  return component;
}
