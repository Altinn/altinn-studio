import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCard } from './StudioCard';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioCard', () => {
  it('Appends custom attributes to the card element', () => {
    testCustomAttributes(renderCard);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderCard({ className, children: 'Card content' }));
  });
});

const renderCard = (props: React.ComponentProps<typeof StudioCard>): RenderResult =>
  render(<StudioCard {...props} />);
