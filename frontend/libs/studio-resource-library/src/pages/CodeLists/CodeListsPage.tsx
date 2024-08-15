import React from 'react';

type AllowedActions = 'added' | 'deleted' | 'changed';
type Action = Partial<Record<AllowedActions, string | object>>;

export type CodeListsPageProps = {
  codeLists: unknown[];
  onCodeListsChange: (action: Action) => void;
};
export const CodeListPage = ({
  onCodeListsChange,
  codeLists,
}: CodeListsPageProps): React.ReactElement => {
  return (
    <>
      <h2>This page is not implemented yet</h2>
      {codeLists.map((item, index) => (
        <button key={index} onClick={() => onCodeListsChange({ changed: { title: 'newTitle' } })}>
          Placeholder
        </button>
      ))}
    </>
  );
};
