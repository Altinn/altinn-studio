import { ComponentGridItem } from '@app/form-component/app-components/ComponentGridItem';
import { PageRow } from '@app/form-component/app-components/PageRow';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';
import type { Decorator } from '@storybook/react-vite';

/**
 * Renders the story in a page row, the way the app renders a component. The component takes the full row, unless the
 * story sets its width with `parameters: { componentGrid: { size: { md: 6 } } }`.
 */
export const withComponentGrid: Decorator = (Story, context) => {
  const size = (context.parameters.componentGrid as { size?: IGridStyling } | undefined)?.size;
  const labelGrid = context.args.labelGrid as IGridStyling | undefined;

  return (
    <PageRow>
      <ComponentGridItem size={size} labelGrid={labelGrid}>
        <Story />
      </ComponentGridItem>
    </PageRow>
  );
};
