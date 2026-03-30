import { screen } from '@testing-library/react';

export function getFieldsetByLegend(legend: string) {
  return screen.getByRole('group', { name: (acessibleName) => acessibleName.startsWith(legend) });
}
