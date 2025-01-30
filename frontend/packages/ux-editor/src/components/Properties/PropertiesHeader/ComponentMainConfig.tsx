import React from 'react';
import type { FormItem } from '../../../types/FormItem';
import classes from './ComponentMainConfig.module.css';
import { ComponentType } from 'app-shared/types/ComponentType';
import { Accordion } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { Summary2Override } from '../../config/componentSpecificContent/Summary2/Override/Summary2Override';
import type {
  Summary2OverrideConfig,
  Summary2TargetConfig,
} from 'app-shared/types/ComponentSpecificConfig';
import { Summary2Target } from '../../config/componentSpecificContent/Summary2/Summary2Target/Summary2Target';
import { StudioHeading } from '@studio/components';
import { RequiredIndicator } from '../../RequiredIndicator';

export type ComponentMainConfigProps = {
  component: FormItem;
  handleComponentChange: (component: FormItem) => void;
};

export const ComponentMainConfig = ({
  component,
  handleComponentChange,
}: ComponentMainConfigProps) => {
  const [accordionOpen, setAccordionOpen] = React.useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  const handleOverridesChange = (updatedOverrides: Summary2OverrideConfig[]): void => {
    const updatedComponent = { ...component } as FormItem<ComponentType.Summary2>;
    updatedComponent.overrides = updatedOverrides;
    handleComponentChange(updatedComponent);
  };

  const handleTargetChange = (updatedTarget: Summary2TargetConfig): void => {
    const updatedComponent = { ...component } as FormItem<ComponentType.Summary2>;
    updatedComponent.target = updatedTarget;
    updatedComponent.overrides = [];
    handleComponentChange(updatedComponent);
  };

  return (
    <>
      {component.type === ComponentType.Summary2 && (
        <>
          <div className={classes.componentMainConfig}>
            <StudioHeading size='2xs'>
              {t('ux_editor.component_properties.main_configuration')}
              <RequiredIndicator />
            </StudioHeading>
            <Summary2Target target={component.target} onChange={handleTargetChange} />
          </div>
          <Accordion color='subtle'>
            <Accordion.Item open={accordionOpen['summary2overrides'] === true}>
              <Accordion.Header
                onHeaderClick={() =>
                  setAccordionOpen((prev) => {
                    return { ...prev, summary2overrides: !prev['summary2overrides'] };
                  })
                }
              >
                {t('ux_editor.component_properties.summary.override.title')}
              </Accordion.Header>
              <Accordion.Content>
                <Summary2Override
                  target={component.target}
                  overrides={component.overrides}
                  onChange={handleOverridesChange}
                />
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      )}
    </>
  );
};
