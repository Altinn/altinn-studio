import { useSelector } from 'react-redux';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import { useText } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from './LayoutSetsContainer';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';
import { useAppContext } from '../../hooks/useAppContext';
import { StudioHeading, StudioParagraph } from '@studio/components';

export const Elements = () => {
  const { org, app } = useStudioEnvironmentParams();
  const selectedLayout: string = useSelector(selectedLayoutNameSelector);
  const { selectedLayoutSet } = useAppContext();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const receiptName = formLayoutSettings?.receiptLayoutName;
  const layoutSetNames = layoutSetsQuery?.data;

  const hideComponents = selectedLayout === 'default' || selectedLayout === undefined;

  const t = useText();

  return (
    <div className={classes.root}>
      {layoutSetNames && <LayoutSetsContainer />}
      <StudioHeading data-size='xs' className={classes.componentsHeader}>
        {t('left_menu.components')}
      </StudioHeading>
      {hideComponents ? (
        <StudioParagraph className={classes.noPageSelected} data-size='sm'>
          {t('left_menu.no_components_selected')}
        </StudioParagraph>
      ) : receiptName === selectedLayout ? (
        <ConfPageToolbar />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
