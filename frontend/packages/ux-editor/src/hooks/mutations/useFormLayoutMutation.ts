import { useMutation } from '@tanstack/react-query';
import { IExternalFormLayout, IFormLayouts, IInternalLayout } from '../../types/global';
import { convertInternalToLayoutFormat } from '../../utils/formLayoutUtils';
import { previewSignalRHubSubPath } from 'app-shared/api-paths';
import { QueryKey } from '../../types/QueryKey';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import * as signalR from "@microsoft/signalr";

export const useFormLayoutMutation = (org: string, app: string, layoutName: string) => {

  const connection = new signalR.HubConnectionBuilder().withUrl(previewSignalRHubSubPath()).configureLogging(signalR.LogLevel.Information).build();

  async function start() {
    try {
      await connection.start();
      console.log("SignalR Connected.");
    } catch (err) {
      console.log(err);
      setTimeout(start, 5000);
    }
  }

  const { saveFormLayout } = useServicesContext();

  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: IExternalFormLayout = convertInternalToLayoutFormat(layout);
      return saveFormLayout(org, app, layoutName, convertedLayout).then(() => layout);
    },
    onSuccess: async (savedLayout) => {
      await start();
      connection.send("sendMessage", "reload-layouts").catch(function (err) {
        return console.error(err.toString());
      });

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout })
      );
    }
  })
};
