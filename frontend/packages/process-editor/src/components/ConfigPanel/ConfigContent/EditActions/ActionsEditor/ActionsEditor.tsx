import React from 'react';
import {
  StudioCard,
  StudioTabs,
  StudioHeading,
  StudioDivider,
  StudioButton,
  StudioDeleteButton,
} from '@studio/components';
import { CheckmarkIcon } from '@studio/icons';
import { PredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/PredefinedActions/PredefinedActions';
import { CustomActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/CustomActions';

import classes from './ActionsEditor.module.css';
import { Action } from '@altinn/process-editor/utils/bpmn/BpmnActionModeler';

enum TabIds {
  Predefined = 'predefined',
  Custom = 'custom',
}

type ActionsEditorProps = {
  actionElement: Action;
};
export const ActionsEditor = ({ actionElement }: ActionsEditorProps): React.ReactElement => {
  return (
    <StudioCard>
      <StudioCard.Header>
        <StudioHeading level={3} size='xxsmall'>
          Heading
        </StudioHeading>
      </StudioCard.Header>
      <StudioDivider color='subtle' />
      <StudioCard.Content>
        <StudioTabs defaultValue={TabIds.Predefined} size='small' className={classes.tabsContainer}>
          <StudioTabs.List>
            <StudioTabs.Tab value={TabIds.Predefined}>Velg standard handling</StudioTabs.Tab>
            <StudioTabs.Tab value={TabIds.Custom}>Lag egendefinert handling</StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Content value={TabIds.Predefined}>
            <PredefinedActions actionElement={actionElement} />
          </StudioTabs.Content>
          <StudioTabs.Content value={TabIds.Custom}>
            <CustomActions />
          </StudioTabs.Content>
        </StudioTabs>
      </StudioCard.Content>
      <StudioCard.Footer>
        <StudioButton variant='secondary' color='success' icon={<CheckmarkIcon />} />
        <StudioDeleteButton onDelete={() => {}} />
      </StudioCard.Footer>
    </StudioCard>
  );
};
