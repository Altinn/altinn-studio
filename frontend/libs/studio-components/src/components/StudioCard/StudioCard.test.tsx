import React, { ForwardedRef } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCard } from './StudioCard';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import type { StudioCardProps } from 'libs/studio-components-legacy/src';

describe('StudioCard', () => {
  it('Appends custom attributes to the card element', () => {
    testCustomAttributes(renderCard);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderCard({ className }));
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderCard({}, ref));
  });
});

const renderCard = (
  props: Partial<StudioCardProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult =>
  render(
    <StudioCard {...props} ref={ref}>
      Children
    </StudioCard>,
  );
