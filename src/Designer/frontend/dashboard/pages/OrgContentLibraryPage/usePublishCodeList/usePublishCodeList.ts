import { useCallback, useState } from 'react';
import type { PublishCodeListPayload } from 'app-shared/types/api/PublishCodeListPayload';
import { usePublishCodeListMutation } from 'app-shared/hooks/mutations/usePublishCodeListMutation';
import { ArrayUtils } from '@studio/pure-functions';

export type PublishCodeListResult = {
  publish: (payload: PublishCodeListPayload) => void;
  isPublishing: (codeListName: string) => boolean;
};

export function usePublishCodeList(orgName: string): PublishCodeListResult {
  const { isPublishing, onStart, onFinish } = usePublishing();
  const { mutate: publish } = usePublishCodeListMutation(orgName, { onStart, onFinish });
  return { publish, isPublishing };
}

type UsePublishingResult = {
  isPublishing: (codeListName: string) => boolean;
  onStart: (codeListName: string) => void;
  onFinish: (codeListName: string) => void;
};

function usePublishing(): UsePublishingResult {
  const [codeListsPendingPublish, setCodeListsPendingPublish] = useState<string[]>([]);

  const onStart = useCallback(
    (codeListName: string) => setCodeListsPendingPublish((prev) => addItem(prev, codeListName)),
    [setCodeListsPendingPublish],
  );

  const onFinish = useCallback(
    (codeListName: string) => setCodeListsPendingPublish((prev) => removeItem(prev, codeListName)),
    [setCodeListsPendingPublish],
  );

  const isPublishing = useCallback(
    (codeListName: string) => codeListsPendingPublish.includes(codeListName),
    [codeListsPendingPublish],
  );

  return { isPublishing, onStart, onFinish };
}

const addItem = (list: string[], item: string): string[] => [...list, item];
const removeItem = ArrayUtils.removeItemByValue;
