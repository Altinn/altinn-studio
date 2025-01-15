import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import {
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioLink,
  StudioParagraph,
} from '@studio/components';
import React from 'react';
import classes from './LandingPage.module.css';
import { SelectedContextType } from '../../context/HeaderContext';
import { CenterContainer } from 'dashboard/components/CenterContainer';

type LandingPageProps = {
  user: User;
  organizations: Organization[];
  disableDebounce?: boolean;
};

const getMenuItems = (selectedContext: string) => [
  {
    header: 'Apper',
    description: 'Opprett og administrer dine apper',
    link: '/dashboard/' + selectedContext + '/apps',
    buttonText: 'Gå til appoversikt',
    shouldDisplay: true,
  },
  {
    header: 'Ressurser',
    description: 'Opprett og administrer dine ressurser',
    link: '/resourceadm/' + selectedContext + `/${selectedContext}-resources`,
    buttonText: 'Gå til ressursadministrasjon',
    shouldDisplay:
      selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self,
  },
  {
    header: 'Datamodeller',
    description: 'Opprett og administrer dine datamodeller',
    link: `/editor/${selectedContext}/${selectedContext}-datamodels/data-model`,
    buttonText: 'Gå til datamodell-oversikt',
    shouldDisplay:
      selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self,
  },
  {
    header: 'Bibliotek',
    description: 'Administrer dine felles innholdsressurser',
    link: '/dashboard/' + selectedContext + '/content-library',
    buttonText: 'Gå til bibliotek',
    shouldDisplay:
      selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self,
  },
];

export function LandingPage(props: LandingPageProps): JSX.Element {
  const selectedContext = useSelectedContext();
  const menuItems = getMenuItems(selectedContext);
  return (
    <div className={classes.root}>
      <CenterContainer>
        <StudioHeading level={2} size='medium' spacing={true}>
          Velkommen til Altinn Studio.
        </StudioHeading>
        <StudioHeading level={3} size='small' spacing={true}>
          Ditt verktøy for å utvikle digitale tjenester til innbyggere og næringsliv.
        </StudioHeading>
        <div className={classes.menuItems}>
          {menuItems.map((menuItem, index) =>
            menuItem.shouldDisplay ? (
              <LandingPageMenuCard
                key={index}
                header={menuItem.header}
                description={menuItem.description}
                link={menuItem.link}
                buttonText={menuItem.buttonText}
              />
            ) : null,
          )}
        </div>
      </CenterContainer>
    </div>
  );
}

export function LandingPageMenuCard(props: {
  header: string;
  description: string;
  link: string;
  buttonText: string;
}): JSX.Element {
  return (
    <StudioCard color='neutral' className={classes.menuItemCard}>
      <StudioCard.Header>{props.header}</StudioCard.Header>
      <StudioCard.Content>
        <StudioParagraph>{props.description}</StudioParagraph>
        <StudioLink href={props.link}>
          <StudioButton color='second' variant='primary'>
            {props.buttonText}
          </StudioButton>
        </StudioLink>
      </StudioCard.Content>
    </StudioCard>
  );
}
