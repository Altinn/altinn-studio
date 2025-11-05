import type { TranslationKey } from '@altinn-studio/language/type';
import { altinnDocsUrl } from 'app-shared/ext-urls';

export type Item = {
  textKey: string;
};

export type ItemWithLink = {
  link: string;
} & Item;

type ConsequencesDialogData = Array<{
  titleKey: TranslationKey;
  items: Array<Item | ItemWithLink>;
}>;

export const consequencesDialogData: ConsequencesDialogData = [
  {
    titleKey: 'app_deployment.unpublish_considerations_title',
    items: [
      { textKey: 'app_deployment.unpublish_considerations_active_instances' },
      { textKey: 'app_deployment.unpublish_considerations_storage_api' },
    ],
  },
  {
    titleKey: 'app_deployment.unpublish_impact_title',
    items: [
      { textKey: 'app_deployment.unpublish_impact_endpoints' },
      { textKey: 'app_deployment.unpublish_impact_error_page' },
    ],
  },
  {
    titleKey: 'app_deployment.unpublish_alternatives_title',
    items: [
      { textKey: 'app_deployment.unpublish_alternatives_previous_version' },
      { textKey: 'app_deployment.unpublish_alternatives_make_unavailable' },
      {
        textKey: 'app_deployment.unpublish_alternatives_change_access',
        link: altinnDocsUrl({ relativeUrl: 'altinn-studio/v8/reference/logic/instantiation/' }),
      },
      { textKey: 'app_deployment.unpublish_alternatives_add_validation' },
    ],
  },
];
