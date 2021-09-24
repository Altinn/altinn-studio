import { useEffect, useRef, useState } from "react";
import axios, { AxiosRequestConfig } from "axios";

interface FetchState<T> {
  srcUrl?: string;
  data?: T;
  loading: boolean;
  error?: any;
}
const initialState = { loading: true };

export default function useFetch<T>(
  url: string | undefined,
  requestConfig: AxiosRequestConfig = {}
) {
  // Use only one state, to ensure updates are atomic
  const [state, setState] = useState<FetchState<T>>(initialState);
  // Keep a ref for the latest url to invalidate result when url changes
  const urlRef = useRef<string | undefined>();
  urlRef.current = url;

  useEffect(() => {
    if (state !== initialState) setState(initialState);
    if (url) {
      const source = axios.CancelToken.source();
      axios
        .get<T>(url, { ...requestConfig, cancelToken: source.token })
        .then((res) => {
          if (url === urlRef.current) {
            setState({ loading: false, data: res.data, srcUrl: url });
          }
        })
        .catch((err) => {
          if (url === urlRef.current) {
            setState({ loading: false, error: err, srcUrl: url });
          }
        });
      return () => {
        source.cancel();
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    loading: state.loading,
    data: state.srcUrl === urlRef.current ? state.data : undefined,
    error: state.srcUrl === urlRef.current ? state.error : undefined,
  };
}
