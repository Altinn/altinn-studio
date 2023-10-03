import React from 'react';
import { useSelector } from 'react-redux';
import { Divider } from 'app-shared/primitives';
import { Heading } from '@digdir/design-system-react';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';
import classes from './StudioComponents.module.css';
import { useText } from '../../hooks';
import {
    selectedLayoutNameSelector,
    selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const StudioComponents = () => {
    const { org, app } = useStudioUrlParams();
    const selectedLayout: string = useSelector(selectedLayoutNameSelector);
    const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
    const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
    const { receiptLayoutName } = formLayoutSettingsQuery.data;

    const t = useText();

    return (
        <div className={classes.componentsList}>
            <React.Fragment className={classes.componentsHeader}>
                <Heading size='xxsmall'>
                    {t('left_menu.components')}
                </Heading>
                <Divider marginless />
            </React.Fragment>
            {receiptLayoutName === selectedLayout ? <ConfPageToolbar /> : <DefaultToolbar />}
        </div>
    );
};
