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
    expect(screen.getByRole('heading', { name: props.name })).toBeInTheDocument();
    expect(screen.getByText(props.owner)).toBeInTheDocument();
    expect(screen.getByText(props.description)).toBeInTheDocument();
  });

  it('should render template id if name is empty', () => {
    const props: TemplateDetailsProps = {
      id: 'template1',
      name: '',
      description: 'This is a description of Template One.',
      owner: 'owner1',
    };
    render(<TemplateDetails {...props} />);
    expect(screen.getByRole('heading', { name: props.id })).toBeInTheDocument();
    expect(screen.getByText(props.owner)).toBeInTheDocument();
    expect(screen.getByText(props.description)).toBeInTheDocument();
  });

  it('should render template name even if description is missing', () => {
    const props: TemplateDetailsProps = {
      id: 'template1',
      name: 'Template One',
      description: '',
      owner: 'owner1',
    };
    render(<TemplateDetails {...props} />);
    expect(screen.getByRole('heading', { name: props.name })).toBeInTheDocument();
    expect(screen.getByText(props.owner)).toBeInTheDocument();
  });
});
