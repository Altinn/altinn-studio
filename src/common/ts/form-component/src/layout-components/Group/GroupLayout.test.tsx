import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { GroupLayout } from './GroupLayout';

const overrides = {
  'group.title': 'Opplysninger om deg',
  'group.description': 'Fyll ut feltene under',
  'group.help': 'Vi bruker opplysningene til å kontakte deg',
};

const render = (props?: Partial<ComponentProps<typeof GroupLayout>>) =>
  renderWithTranslations(
    <GroupLayout componentId='my-group' {...props}>
      <span>Innhold</span>
    </GroupLayout>,
    { overrides },
  );

describe('GroupLayout', () => {
  it('renders the children in a container with the group id', () => {
    render({ baseComponentId: 'my-group-base' });
    const container = screen.getByTestId('display-group-container');
    expect(container).toHaveAttribute('id', 'my-group');
    expect(container).toHaveAttribute('data-componentid', 'my-group');
    expect(container).toHaveAttribute('data-componentbaseid', 'my-group-base');
    expect(screen.getByText('Innhold')).toBeInTheDocument();
  });

  it('uses containerId as the container id when given', () => {
    render({ containerId: 'other-id' });
    expect(screen.getByTestId('display-group-container')).toHaveAttribute('id', 'other-id');
  });

  it('renders the title as a heading at the given level, with description and help text', () => {
    render({
      title: 'group.title',
      description: 'group.description',
      help: 'group.help',
      headingLevel: 3,
    });
    expect(
      screen.getByRole('heading', { level: 3, name: 'Opplysninger om deg' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Fyll ut feltene under')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opplysninger om deg/ })).toBeInTheDocument();
  });

  it('renders no legend without a title', () => {
    render();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('leaves out the description and help text in a summary', () => {
    render({
      title: 'group.title',
      description: 'group.description',
      help: 'group.help',
      isSummary: true,
    });
    expect(screen.getByRole('heading', { name: 'Opplysninger om deg' })).toBeInTheDocument();
    expect(screen.queryByText('Fyll ut feltene under')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
