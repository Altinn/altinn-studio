import type { Decorator } from '@storybook/react-vite';

import { ComponentGridItem } from '../../../app-components/ComponentGridItem';
import { PageRow } from '../../../app-components/PageRow';
import type { IGridStyling } from '../../../app-components/Flex/Flex';

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
