import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioCenter,
  StudioHeading,
  StudioLink,
  StudioParagraph,
} from '@studio/components';
import { RepositoryType } from 'app-shared/types/global';
import { getRepositoryEditUrl } from 'app-shared/utils/repository';
import classes from './UnsupportedRepositoryPage.module.css';

type UnsupportedRepositoryType = RepositoryType.Resources | RepositoryType.OrgLibrary;

type UnsupportedRepositoryTextKeys = {
  description: string;
  link: string;
};

const textKeysByRepositoryType: Record<UnsupportedRepositoryType, UnsupportedRepositoryTextKeys> = {
  [RepositoryType.Resources]: {
    description: 'unsupported_repository_page.resources_description',
    link: 'unsupported_repository_page.go_to_resources',
  },
  [RepositoryType.OrgLibrary]: {
    description: 'unsupported_repository_page.org_library_description',
    link: 'unsupported_repository_page.go_to_org_library',
  },
};

export function isUnsupportedRepositoryType(
  repositoryType: RepositoryType,
): repositoryType is UnsupportedRepositoryType {
  return repositoryType in textKeysByRepositoryType;
}

export type UnsupportedRepositoryPageProps = {
  org: string;
  repoName: string;
  repositoryType: UnsupportedRepositoryType;
};

export const UnsupportedRepositoryPage = ({
  org,
  repoName,
  repositoryType,
}: UnsupportedRepositoryPageProps): ReactElement => {
  const { t } = useTranslation();
  const textKeys = textKeysByRepositoryType[repositoryType];

  return (
    <StudioCenter>
      <StudioAlert data-color='info' className={classes.alert}>
        <StudioHeading level={1} data-size='xs' spacing>
          {t('unsupported_repository_page.heading', { repoName })}
        </StudioHeading>
        <StudioParagraph spacing>{t(textKeys.description)}</StudioParagraph>
        <StudioLink href={getRepositoryEditUrl(org, repoName)}>{t(textKeys.link)}</StudioLink>
      </StudioAlert>
    </StudioCenter>
  );
};
