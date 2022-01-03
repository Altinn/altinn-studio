import 'jest';
import * as React from 'react';
import '@testing-library/jest-dom/extend-expect';
import * as renderer from 'react-test-renderer';
import Legend from '../../../../src/features/form/components/Legend';

describe('features > form > components > Legend.tsx', () => {
  it('should render optional', () => {
    const rendered = renderer.create(
      <Legend
        id='legend1'
        labelText='legend.text'
        helpText=''
        language={{}}
        required={false}
        descriptionText='legend.description'
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because required', () => {
    const rendered = renderer.create(
      <Legend
        id='legend1'
        labelText='legend.text'
        helpText=''
        language={{}}
        required={true}
        descriptionText='legend.description'
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because labelSettings.optionalIndicator is false', () => {
    const rendered = renderer.create(
      <Legend
        id='legend1'
        labelText='legend.text'
        helpText=''
        language={{}}
        required={false}
        labelSettings={{ optionalIndicator: false }}
        descriptionText='legend.description'
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because required is true even when labelSettings.optionalIndicator is true', () => {
    const rendered = renderer.create(
      <Legend
        id='legend1'
        labelText='legend.text'
        helpText=''
        language={{}}
        required={true}
        labelSettings={{ optionalIndicator: true }}
        descriptionText='legend.description'
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
