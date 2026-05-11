import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioField } from './StudioField';
import type { StudioFieldProps } from './StudioField';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const testInput = <input type='text' />;

describe('StudioField', () => {
  it('renders children correctly', () => {
    renderField();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderField({ className }));
  });

  it('Appends custom attributes to the field element', () => {
    testCustomAttributes(renderField);
  });
});

const renderField = (props: Partial<StudioFieldProps> = {}): RenderResult => {
  return render(<StudioField {...props}>{testInput}</StudioField>);
};
