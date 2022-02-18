import * as React from 'react';
import * as renderer from 'react-test-renderer';

import Label from './Label';

describe('features > form > components >Label.tsx', () => {
  it('should render optional', () => {
    const rendered = renderer.create(
      <Label
        id='label1'
        labelText='label.text'
        helpText=''
        language={{}}
        readOnly={false}
        required={false}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because required', () => {
    const rendered = renderer.create(
      <Label
        id='label1'
        labelText='label.text'
        helpText=''
        language={{}}
        readOnly={false}
        required={true}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because readOnly', () => {
    const rendered = renderer.create(
      <Label
        id='label1'
        labelText='label.text'
        helpText=''
        language={{}}
        readOnly={true}
        required={false}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because labelSettings.optionalIndicator is false', () => {
    const rendered = renderer.create(
      <Label
        id='label1'
        labelText='label.text'
        helpText=''
        language={{}}
        readOnly={false}
        required={false}
        labelSettings={{ optionalIndicator: false }}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should not render optional because required is true even when labelSettings.optionalIndicator is true', () => {
    const rendered = renderer.create(
      <Label
        id='label1'
        labelText='label.text'
        helpText=''
        language={{}}
        readOnly={false}
        required={true}
        labelSettings={{ optionalIndicator: true }}
      />,
    );
    expect(rendered).toMatchSnapshot();
  });
});
