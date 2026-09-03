import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useText } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';
import { useAppContext } from '../../hooks/useAppContext';
import { StudioSelect } from '@studio/components';

export function LayoutSetsContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.map((set) => set.id);
  const t = useText();
  const { selectedLayoutSet, setSelectedLayoutSet } = useAppContext();

  const onLayoutSetClick = (set: string) => {
    if (selectedLayoutSet !== set) {
      setSelectedLayoutSet(set);
    }
  };

  if (!layoutSetNames) return null;

  return (
    <div className={classes.dropDownContainer}>
      <StudioSelect
        label={t('left_menu.layout_dropdown_menu_label')}
        onChange={(event) => onLayoutSetClick(event.target.value)}
        value={selectedLayoutSet}
      >
        {layoutSetNames.map((set: string) => {
          return (
            <StudioSelect.Option key={set} value={set}>
              {set}
            </StudioSelect.Option>
          );
        })}
      </StudioSelect>
    </div>
  );
}
