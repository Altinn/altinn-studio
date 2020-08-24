/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { ITextResource, IRuntimeState } from 'src/types';

export default function CustomView() {
  // Load app text resources
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  // Load app standard texts
  const language: any = useSelector((state: IRuntimeState) => (state.language ? state.language.language : {}));

  return (
    <div id='custom-view-container'>
      <h2>This is a custom view</h2>
    </div>
  );
}
