import React from 'react';
import classes from './PageAccordionItem.module.css';
import { FormComponent } from '../../../../types/FormComponent';
import {
  getComponentTitleByComponentType,
  getTextResource,
  truncate,
} from '../../../../utils/language';
import { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../../../../hooks';
import { textResourcesByLanguageSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { Button, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { TrashIcon } from '@navikt/aksel-icons';

export type PageAccordionItemProps = {
  component: FormComponent;
};
export const PageAccordionItem = ({ component }: PageAccordionItemProps) => {
  const { t } = useTranslation();

  // COMPONENT NAME
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );
  const textResource =
    getTextResource(component?.textResourceBindings?.title, textResources) ?? null;

  const componentTitle = component?.type
    ? getComponentTitleByComponentType(component.type, t)
    : 'Ukjent komponent';

  const componentName = textResource ? truncate(textResource, 80) : componentTitle;

  // COMPONENT ICON
  const Icon = component?.type ? formItemConfigs[component?.type]?.icon : null;

  return (
    <div className={classes.wrapper}>
      <div className={classes.iconAndTitle}>
        {Icon && <Icon className={classes.icon} />}
        <Paragraph size='small'>{componentName}</Paragraph>
      </div>
      <Button
        variant='quiet'
        color='danger'
        size='small'
        icon={<TrashIcon title='Fjern komponent' />}
        onClick={() => {}}
      />
    </div>
  );
};
