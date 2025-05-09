import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSwitch } from './StudioSwitch';
import type { StudioSwitchProps } from './StudioSwitch';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioSwitch', () => {
  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioSwitch({ label: 'test', className }));
  });
});

const renderStudioSwitch = (props: StudioSwitchProps): RenderResult => {
  return render(<StudioSwitch {...props} />);
};
