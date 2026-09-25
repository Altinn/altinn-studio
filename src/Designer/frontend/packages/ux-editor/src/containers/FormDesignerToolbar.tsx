import classes from './FormDesignerToolbar.module.css';
import { ToggleAddComponentPoc } from './DesignView/AddItem/ToggleAddComponentPoc';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { useAppContext, useFormLayouts } from '../hooks';
import { StudioChip } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import useUxEditorParams from '../hooks/useUxEditorParams';

export const FormDesignerToolbar = () => {
  return (
    <div>
      <section className={classes.toolbar}>
        <BreadcrumbsTaskNavigation />
        {/* POC of new design for adding components*/}
        <ToggleAddComponentPoc />
      </section>
      <PageSelectToolbar />
    </div>
  );
};

export const PageSelectToolbar = () => {
  const { layoutSet } = useUxEditorParams();
  const { org, app } = useStudioEnvironmentParams();

  // const layouts = useFormLayouts();
  const { selectedFormLayoutName, setSelectedFormLayoutName } = useAppContext();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSet);

  return (
    <section className={`${classes.toolbar} ${classes.pages}`}>
      {(formLayoutSettings?.pages?.order ?? []).map((layoutKey) => (
        <StudioChip.Button
          key={layoutKey}
          style={
            layoutKey === selectedFormLayoutName
              ? { fontWeight: 'bold', color: 'white', backgroundColor: 'blue' }
              : {}
          }
          onClick={() => setSelectedFormLayoutName(layoutKey)}
        >
          {layoutKey}
        </StudioChip.Button>
      ))}
    </section>
  );
};
