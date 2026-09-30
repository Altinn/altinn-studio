import classes from './ConfPageToolbar.module.css';
import type { IToolbarElement } from '../../types/global';
import { ToolbarItem } from './ToolbarItem';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import type { ConfPageType } from './types/ConfigPageType';
import { ElementsUtils } from './ElementsUtils';
import { useComponentTitle } from '@altinn/ux-editor/hooks';

export type ConfPageToolbarProps = {
  confPageType: ConfPageType;
};

export const ConfPageToolbar = ({ confPageType }: ConfPageToolbarProps) => {
  const getComponentTitle = useComponentTitle();

  const componentList: IToolbarElement[] = ElementsUtils.getAvailableComponentList(
    confPageType,
  ).map(mapComponentToToolbarElement);

  return (
    <div className={classes.customComponentList}>
      {componentList.map((component: IToolbarElement) => (
        <ToolbarItem
          componentTitle={getComponentTitle(component)}
          icon={component.icon}
          componentType={component.type}
          key={component.type}
        />
      ))}
    </div>
  );
};
