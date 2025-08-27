import React, { type ReactElement } from 'react';
import { ResourceItem } from '../ResourceItem';
import classes from './Resources.module.css';
import { useTranslation } from 'react-i18next';
import {
  OrgResourceIcon,
  DocsResourceIcon,
  ContactResourceIcon,
  DesignResourceIcon,
  RoadmapResourceIcon,
  OperationStatusResourceIcon,
} from 'libs/studio-icons/src';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioHeading } from '@studio/components-legacy';
import { type Resource } from '../../types/Resource';

const resources: Resource[] = [
  {
    label: 'dashboard.resource_docs_label',
    description: 'dashboard.resource_docs_description',
    url: altinnDocsUrl(),
    icon: <DocsResourceIcon width='60' height='60' />,
  },
  {
    label: 'dashboard.resource_organisations_label',
    description: 'dashboard.resource_organisations_description',
    url: `${window.location.origin}/repos/explore/organizations`,
    icon: <OrgResourceIcon width='60' height='60' />,
  },
  {
    label: 'dashboard.resource_contact_label',
    description: 'dashboard.resource_contact_description',
    url: 'https://altinn.studio/info/contact',
    icon: <ContactResourceIcon width='60' height='60' />,
  },
  {
    label: 'dashboard.resource_design_label',
    description: 'dashboard.resource_design_description',
    url: 'https://www.figma.com/file/wnBveAG2ikUspFsQwM3GNE/Prototyping-av-skjematjenester?node-id=47%3A4068',
    icon: <DesignResourceIcon width='60' height='60' />,
  },
  {
    label: 'dashboard.resource_roadmap_label',
    description: 'dashboard.resource_roadmap_description',
    url: altinnDocsUrl({ relativeUrl: 'community/roadmap/' }),
    icon: <RoadmapResourceIcon width='60' height='60' />,
  },
  {
    label: 'dashboard.resource_status_label',
    description: 'dashboard.resource_status_description',
    url: 'https://status.digdir.no/',
    icon: <OperationStatusResourceIcon width='60' height='60' />,
  },
];

export function Resources(): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.wrapper}>
      <StudioHeading level={2} size='sm' className={classes.header}>
        {t('dashboard.resources')}
      </StudioHeading>
      <div className={classes.resourcesContainer}>
        {resources.map((resource: Resource, index: number) => (
          <ResourceItem key={`resource-item-${index}`} resource={resource} />
        ))}
      </div>
    </div>
  );
}
