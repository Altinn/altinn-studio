import { IConnection } from '../components/config/ApiConfigurationComponent';
import { IApiConnection } from '../reducers/apiReducer';

/*
  Returns a code-list connection id for a given data model binding, or undefined if it does not exist
*/
export function getCodeListConnectionForDatamodelBinding(dataModelId: string, connections: IApiConnection): string {
  let connectionId: string;
  for (const connectionKey of Object.keys(connections)) {
    const connection: IConnection = connections[connectionKey];
    if (!connection.codeListId) {
      continue;
    }
    const dataModelBinding = Object.keys(connection.apiResponseMapping)[0];
    if (dataModelBinding === dataModelId) {
      connectionId = connectionKey;
    }
  }
  return connectionId;
}
