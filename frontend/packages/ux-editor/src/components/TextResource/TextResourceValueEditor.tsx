import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { StudioTextarea } from '@studio/components';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { ITextResource, ITextResources } from 'app-shared/types/global';

export type TextResourceValueEditorProps = {
  textResourceId: string;
  onReferenceChange: (id: string) => void;
};

const language = DEFAULT_LANGUAGE;

const findTextResource = (textResources: ITextResources, id: string) =>
  textResources?.[language]?.find((resource) => resource.id === id);

const getTextResourceValue = (textResources: ITextResources, id: string) =>
  findTextResource(textResources, id)?.value || '';

export const TextResourceValueEditor = ({
  onReferenceChange,
  textResourceId,
}: TextResourceValueEditorProps) => {
  const { org, app } = useStudioUrlParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { mutate } = useUpsertTextResourcesMutation(org, app);
  const value = getTextResourceValue(textResources, textResourceId);
  const [valueState, setValueState] = useState<string>(value);

  useEffect(() => {
    setValueState(value);
  }, [value]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = event.target;
      const textResource: ITextResource = { id: textResourceId, value };
      const textResources: ITextResource[] = [textResource];
      mutate({ language, textResources });
    },
    [textResourceId, onReferenceChange, mutate],
  );

  return (
    <>
      <StudioTextarea label='Tekst' onBlur={handleChange} value={valueState} />
      ID: {textResourceId}
    </>
  );
};
