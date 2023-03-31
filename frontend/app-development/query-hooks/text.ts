import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import { useServicesContext } from '../common/ServiceContext';
import { CacheKey } from 'app-shared/api-paths/cache-key';
import { LangCode, TextResourceEntry, TextResourceFile } from '@altinn/text-editor';
import { TextResourceIdMutation, UpsertTextResourcesMutation } from '@altinn/text-editor/src/types';
import { QueriesResults } from '@tanstack/react-query/build/lib/useQueries';

export const useTextResourceFile = (owner, app, lang): UseQueryResult<TextResourceFile> => {
  const { getTextResources } = useServicesContext();
  return useQuery<TextResourceFile>([CacheKey.TextResources, owner, app, lang], () =>
    getTextResources(owner, app, lang)
  );
};

export const useTextResourceFiles = (owner, app, langs): QueriesResults<TextResourceFile[]> => {
  const { getTextResources } = useServicesContext();
  return useQueries({
    queries: langs.map((lang) => ({
      queryKey: [CacheKey.TextResources, owner, app, lang],
      queryFn: () => getTextResources(owner, app, lang),
    })),
  });
};

export const useReloadTextResourceFiles = (owner, app) => {
  const q = useQueryClient();
  return () => q.invalidateQueries({ queryKey: [CacheKey.TextResources, owner, app] });
};

type LanguageList = string[];

export const useTextLanguages = (owner, app): UseQueryResult<LanguageList> => {
  const { getTextLanguages } = useServicesContext();
  return useQuery<LanguageList>([CacheKey.TextLanguages, owner, app], () =>
    getTextLanguages(owner, app)
  );
};

export const useTranslationByLangCodeMutation = (owner, app, langCode) => {
  const q = useQueryClient();
  const { updateTranslationByLangCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: TextResourceFile) =>
      updateTranslationByLangCode(owner, app, langCode, payload),
    onSuccess: () =>
      q.invalidateQueries({ queryKey: [CacheKey.TextResources, owner, app, langCode] }),
  });
};

export const useTextIdMutation = (owner, app) => {
  const q = useQueryClient();
  const { updateTextId } = useServicesContext();
  return useMutation({
    mutationFn: (payload: TextResourceIdMutation[]) => updateTextId(owner, app, payload),
    onSuccess: () => q.invalidateQueries({ queryKey: [CacheKey.TextResources, owner, app] }),
  });
};

export const useAddLanguageMutation = (owner, app) => {
  const q = useQueryClient();
  const { addLanguageCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: { language: LangCode; resources: TextResourceEntry[] }) =>
      addLanguageCode(owner, app, payload.language, payload),
    onSuccess: () => q.invalidateQueries({ queryKey: [CacheKey.TextLanguages, owner, app] }),
  });
};

export const useDeleteLanguageMutation = (owner, app) => {
  const q = useQueryClient();
  const { deleteLanguageCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: { langCode: string }) => deleteLanguageCode(owner, app, payload.langCode),
    onSuccess: () => q.invalidateQueries({ queryKey: [CacheKey.TextLanguages, owner, app] }),
  });
};

export const useUpsertTextResourcesMutation = (owner, app) => {
  const { upsertTextResources } = useServicesContext();
  return useMutation({
    mutationFn: (payload: UpsertTextResourcesMutation) =>
      upsertTextResources(owner, app, payload.language, { [payload.textId]: payload.translation }),
    onSuccess: () => {},
  });
};
