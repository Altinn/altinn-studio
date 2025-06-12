import React from 'react';
import { StudioDetails } from './';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioDetails', () => {
  it('Appends custom attributes to the details element', () => {
    testCustomAttributes(renderDetails);
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderDetails({ className }));
  });
});

const renderDetails = (props: React.ComponentProps<typeof StudioDetails>): RenderResult =>
  render(<StudioDetails {...props} />);
