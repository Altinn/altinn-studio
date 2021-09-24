import {
  getCulturesResponse,
  getCulturesUrl,
  getLanguagesResponse,
  getLanguagesUrl,
  Languages,
} from "../api";
import useFetch from "./useFetch";

type CultureList = { id: Languages; name: string }[];
export type CultureData = { active: CultureList; cultures: CultureList };
export type useLanguagesResponse = {
  data: CultureData | undefined;
  loading: boolean;
  error: any;
};

export default function useLanguages(): useLanguagesResponse {
  const lang = useFetch<getLanguagesResponse>(getLanguagesUrl());
  const cultures = useFetch<getCulturesResponse>(getCulturesUrl());
  if (lang.error || cultures.error) {
    return {
      data: undefined,
      loading: false,
      error: lang.error || cultures.error,
    };
  }
  if (lang.loading || cultures.loading) {
    return {
      data: undefined,
      loading: true,
      error: undefined,
    };
  }

  return {
    data: {
      active: lang.data.map(
        (code) =>
          cultures.data.cultures.find((culture) => culture.id === code) || {
            id: code,
            name: code,
          }
      ),
      cultures: cultures.data.cultures,
    },
    loading: false,
    error: undefined,
  };
}
