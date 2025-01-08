import React from 'react';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { Accordion } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { Summary2Override } from '../../config/componentSpecificContent/Summary2/Override/Summary2Override';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';

export type ComponentMainConfigProps = {
  component: FormItem;
  handleComponentChange: (component: FormItem) => void;
};

export const ComponentMainConfig = ({
  component,
  handleComponentChange,
}: ComponentMainConfigProps) => {
  const [accordionOpen, setAccordionOpen] = React.useState<string[]>([]);
  const { t } = useTranslation();

  const handleOverridesChange = (updatedOverrides: Summary2OverrideConfig[]): void => {
    const updatedComponent = { ...component } as FormItem<ComponentType.Summary2>;
    updatedComponent.overrides = updatedOverrides;
    handleComponentChange(updatedComponent);
  };

  return (
    <>
      {component.type === ComponentType.Summary2 && (
        <Accordion color='subtle'>
          <Accordion.Item open={accordionOpen['summary2overrides'] === true}>
            <Accordion.Header
              onHeaderClick={() =>
                setAccordionOpen((prev) => {
                  return { ...prev, summary2overrides: !prev['summary2overrides'] };
                })
              }
            >
              {t('Overstyr hva som skal vises')}
            </Accordion.Header>
            <Accordion.Content>
              <Summary2Override overrides={component.overrides} onChange={handleOverridesChange} />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )}
    </>
  );
};
