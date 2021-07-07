import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import DeleteDialog from '../../../../features/dataModelling/components/DeleteDialog';

describe('>>> DeleteDialog.tsx', () => {
  const language = { administration: {} };
  let schemaName: string;
  beforeEach(() => {
    schemaName = 'some-name';
  });
  const mountComponent = () => mount(<DeleteDialog
    anchor={document.body}
    language={language}
    schemaName={schemaName}
    onCancel={() => {}}
    onConfirm={() => {}}
  />);
  it('+++ Should match snapshot with the least amount of params', () => {
    const rendered = mountComponent().html();
    expect(rendered).toMatchSnapshot();
  });
});
