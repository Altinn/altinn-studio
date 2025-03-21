import { type ReactNode } from 'react';

export type StudioPaginatedItem = {
  pageContent: ReactNode;
  validationRuleForNextButton?: boolean;
};
