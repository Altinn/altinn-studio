import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { ReportData } from '../types/ReportData';

export const useReportDataQuery = (org: string, env: string, token: string) =>
  useQuery<ReportData>({
    queryKey: ['reportData', org, env, token],
    queryFn: ({ signal }) =>
      axios
        .get<ReportData>(`/designer/api/v1/admin/reports/${org}/${env}/data`, {
          params: { token },
          signal,
        })
        .then((r) => r.data),
    staleTime: Infinity,
    retry: false,
  });
