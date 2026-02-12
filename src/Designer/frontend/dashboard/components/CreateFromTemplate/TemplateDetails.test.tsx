import React from 'react';
import { TemplateDetails, type TemplateDetailsProps } from './TemplateDetails';
import { render, screen } from '@testing-library/react';

describe('TemplateDetails', () => {
  it('should render template details correctly', () => {
    const props: TemplateDetailsProps = {
      id: 'template1',
      name: 'Template One',
      description: 'This is a description of Template One.',
      owner: 'owner1',
    };
    render(<TemplateDetails {...props} />);
    expect(screen.getByText('Template One')).toBeInTheDocument();
    expect(screen.getByText('owner1')).toBeInTheDocument();
    expect(screen.getByText('This is a description of Template One.')).toBeInTheDocument();
  });

  it('should render template id if name is empty', () => {
    const props: TemplateDetailsProps = {
      id: 'template1',
      name: '',
      description: 'This is a description of Template One.',
      owner: 'owner1',
    };
    render(<TemplateDetails {...props} />);
    expect(screen.getByText('template1')).toBeInTheDocument();
    expect(screen.getByText('owner1')).toBeInTheDocument();
    expect(screen.getByText('This is a description of Template One.')).toBeInTheDocument();
  });

  it('should render template name even if description is missing', () => {
    const props: TemplateDetailsProps = {
      id: 'template1',
      name: 'Template One',
      description: undefined,
      owner: 'owner1',
    };
    render(<TemplateDetails {...props} />);
    expect(screen.getByText('Template One')).toBeInTheDocument();
    expect(screen.getByText('owner1')).toBeInTheDocument();
    expect(screen.queryByText('This is a description of Template One.')).not.toBeInTheDocument();
  });
});
