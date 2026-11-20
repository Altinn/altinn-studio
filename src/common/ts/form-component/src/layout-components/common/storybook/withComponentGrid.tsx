import { ComponentGridItem } from '@app/form-component/app-components/ComponentGridItem';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';
import type { Decorator } from '@storybook/react-vite';

import { PageRow } from './PageRow';

/** Renders the story in a page row, the way the app renders a component. */
export const withComponentGrid: Decorator = (Story, context) => {
  const labelGrid = context.args.labelGrid as IGridStyling | undefined;

  return (
    <PageRow>
      <ComponentGridItem labelGrid={labelGrid}>
        <Story />
      </ComponentGridItem>
    </PageRow>
  );
};
