import { useMutation } from '@tanstack/react-query';
import { IExternalFormLayout, IFormLayouts, IInternalLayout } from '../../types/global';
import { convertInternalToLayoutFormat, } from '../../utils/formLayoutUtils';
import { QueryKey } from '../../types/QueryKey';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import * as signalR from "@microsoft/signalr";

export const useFormLayoutMutation = (org: string, app: string, layoutName: string) => {
  const connection = new signalR.HubConnectionBuilder().withUrl("/previewHub").build();

  const { saveFormLayout } = useServicesContext();

  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: IExternalFormLayout = convertInternalToLayoutFormat(layout);
      return saveFormLayout(org, app, layoutName, convertedLayout).then(() => layout);
    },
    onSuccess: (savedLayout) => {
      connection.send("sendMessage", "reload-layouts");
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout })
      );
    }
  })
};
