import * as React from 'react';
import { connect } from 'react-redux';
import * as uuid from 'uuid/v1'; // time
import * as uuidv4 from 'uuid/v4'; // random
import { CodeListComponent } from './CodeListComponent';
import { ExternalApiComponent } from './ExternalAPIComponent';
export interface IProvidedProps {
  connectionId?: any;
  saveEdit: (updatedConnection: any) => void;
  cancelEdit: () => void;
  deleteConnection: (connectionId: any) => void;
  language: any;
}

export interface IApiConfigurationProps extends IProvidedProps {
  APIs: any;
  dataModelElements: IDataModelFieldElement[];
  codeLists: any[];
}

export interface IConnection {
  externalApiId: any;
  codeListId: any;
  clientParams: any;
  metaParams: any;
  apiResponseMapping: any;
}

export interface IApiConfigurationState {
  apiResponse: any;
  formDataApiTest: any;
  componentApiResponseMappingsById: any;
  componentApiResponseMappingsAllIds: any[];
  connectionId: any;
  connection: IConnection;
  apiType: any;
}

class ApiConfiguration extends React.Component<IApiConfigurationProps, IApiConfigurationState> {

  constructor(_props: IApiConfigurationProps, _state: IApiConfigurationState) {
    super(_props);
    this.state = {
      apiResponse: null,
      formDataApiTest: null,
      componentApiResponseMappingsById: null,
      componentApiResponseMappingsAllIds: [],
      connectionId: null,
      connection: {
        externalApiId: null,
        codeListId: null,
        clientParams: null,
        metaParams: null,
        apiResponseMapping: null,
      },
      apiType: null,
    };
  }

  public componentDidMount() {
    // If component takes connectionId prop, get connection from "store" and set state.componentApiResponseMappings...
    if (this.props.connectionId) {

      let newComponentApiResponseMappingsById: any;
      const newComponentApiResponseMappingsAllIds: any[] = [];
      const apiResponseMapping = this.props.APIs.connections[this.props.connectionId].apiResponseMapping;

      Object.keys(apiResponseMapping).map((key) => {
        const tempUuid = uuidv4();
        newComponentApiResponseMappingsById = {
          ...newComponentApiResponseMappingsById, // TODO: This is empty, so can it just be removed?
          [tempUuid]: {
            mappingObject: key,
            resultObject: apiResponseMapping[key].mappingKey,
          },
        };

        if (apiResponseMapping[key].valueKey) {
          newComponentApiResponseMappingsById[tempUuid].valueKey = apiResponseMapping[key].valueKey;
        }

        if (apiResponseMapping[key].labelKey) {
          newComponentApiResponseMappingsById[tempUuid].labelKey = apiResponseMapping[key].labelKey;
        }

        newComponentApiResponseMappingsAllIds.push(tempUuid);
      });

      let apiType: string = null;
      if (this.props.APIs.connections[this.props.connectionId].codeListId) {
        apiType = 'codelist';
      }

      if (this.props.APIs.connections[this.props.connectionId].externalApiId) {
        apiType = 'externalapi';
      }

      this.setState({
        connectionId: this.props.connectionId,
        connection: {
          ...this.props.APIs.connections[this.props.connectionId],
        },
        componentApiResponseMappingsById: {
          ...newComponentApiResponseMappingsById,
        },
        componentApiResponseMappingsAllIds: newComponentApiResponseMappingsAllIds,
        formDataApiTest: {
          ...this.props.APIs.connections[this.props.connectionId].metaParams,
        },
        apiType,
      });
    } else {
      this.setState({ connectionId: uuid() });
    }
  }

  public handleSaveEdit = (): void => {
    const apiResponseMappingObj = this.state.componentApiResponseMappingsAllIds.reduce((acc: any, elem: any) => {
      const element = this.state.componentApiResponseMappingsById[elem];
      acc[element.mappingObject] = {
        mappingKey: element.resultObject,
      };

      if (element.valueKey) {
        acc[element.mappingObject].valueKey = element.valueKey;
      }

      if (element.labelKey) {
        acc[element.mappingObject].labelKey = element.labelKey;
      }

      return acc;
    }, {});

    const updatedConnection = {
      [this.state.connectionId]: {
        ...this.state.connection,
        apiResponseMapping: apiResponseMappingObj,
      },
    };

    this.props.saveEdit(updatedConnection);
  }

  public handleDeleteConnection = () => {
    this.props.deleteConnection(this.props.connectionId);
  }

  public addMapping = (): void => {
    const newId = uuid();

    this.setState({
      ...this.state,
      componentApiResponseMappingsById: {
        ...this.state.componentApiResponseMappingsById,
        [newId]: {
          resultObject: '',
          mappingObject: '',
          valueKey: '',
          labelKey: '',
        },
      },
      componentApiResponseMappingsAllIds: this.state.componentApiResponseMappingsAllIds.concat(newId),
    });
  }

  public removeMapping = (removeId: any) => {
    this.setState({
      ...this.state,
      componentApiResponseMappingsAllIds:
        this.state.componentApiResponseMappingsAllIds.filter((id: any) => id !== removeId),
    });
  }

  public handleMappingChange = (id: any, name: string, e: any) => {
    let value: string;
    if (!e.target) {
      value = e;
    } else {
      value = e.target.value;
    }
    this.setState((prevState, props) => {
      return {
        ...prevState,
        componentApiResponseMappingsById: {
          ...prevState.componentApiResponseMappingsById,
          [id]: {
            ...prevState.componentApiResponseMappingsById[id],
            [name]: value,
          },
        },
      };
    });
  }

  public handleSelectedApiChange = (e: any): void => {
    const value = e.target.value;
    if (this.state.apiType === 'codelist') {
      this.setState({
        connection: {
          ...this.state.connection,
          codeListId: value,
          externalApiId: null,
        },
      });
    } else {
      this.setState({
        connection: {
          ...this.state.connection,
          externalApiId: value,
          codeListId: null,
        },
      });
    }
  }

  public handleApiTypeChange = (selectedValue: any): void => {
    this.setState({
      apiType: selectedValue,
    });
  }

  public handleClientParamsChange = (name: any, value: any): void => {
    this.setState({
      connection: {
        ...this.state.connection,
        clientParams: {
          ...this.state.connection.clientParams,
          [name]: value,
        },
      },
    });
  }

  public handleMetaParamsChange = (e: any): void => {
    const name = e.target.name;
    const value = e.target.value;

    this.setState({
      connection: {
        ...this.state.connection,
        metaParams: {
          ...this.state.connection.metaParams,
          [name]: value,
        },
      },
    });
  }

  public renderSelectAPI = (selectedApi: any, codeList: boolean): JSX.Element => {
    if (!selectedApi) {
      selectedApi = '';
    }
    const label = codeList ? 'Codelist' : 'External API';
    return (
      <div className='form-group a-form-group'>
        <label htmlFor='selectExternalApi' className='a-form-label'>{label}</label>
        <select
          name='selectedApi'
          onChange={this.handleSelectedApiChange}
          value={selectedApi}
          className='custom-select a-custom-select'
          id='selectExternalApi'
        >
          <option value={''}>Choose {label}</option>
          {codeList ?
            this.props.codeLists.map((item: any) => {
              return (
                <option key={item.id} value={item.codeListName}>{item.codeListName}</option>
              );
            })
            :
            this.props.APIs.externalApisIds.map((id: string) => {
              return (
                <option key={id} value={id}>{this.props.APIs.externalApisById[id].name}</option>
              );
            })
          }

        </select>
      </div>
    );
  }

  public renderSelectApiType = (): JSX.Element => {
    return (
      <div className='row'>
        <div
          className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
          onClick={this.handleApiTypeChange.bind(this, 'codelist')}
        >
          <input
            type='radio'
            name={'radio-select-api-type'}
            className='custom-control-input'
            checked={this.state.apiType === 'codelist'}
          />
          <label className='custom-control-label pl-3 a-radioButtons-title'>
            {this.props.language.ux_editor.modal_configure_api_code_list}
          </label>
        </div>
        <div
          className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
          onClick={this.handleApiTypeChange.bind(this, 'externalapi')}
        >
          <input
            type='radio'
            name={'radio-select-api-type'}
            className='custom-control-input'
            checked={this.state.apiType === 'externalapi'}
          />
          <label className='custom-control-label pl-3 a-radioButtons-title'>
            {this.props.language.ux_editor.modal_configure_api_extermnal_api}
          </label>
        </div>
      </div>
    );
  }

  public renderActionButtons = (): JSX.Element => {
    return (
      <div className='row mt-3'>
        <div className='col'>
          {this.state.connection.externalApiId || this.state.connection.codeListId ?
            /* Save button */
            < button
              type='submit'
              className='a-btn a-btn-success mr-2'
              onClick={this.handleSaveEdit}
            >
              {this.props.language.general.save}
            </button>
            :
            null
          }
          {this.props.connectionId ?
            /* Delete button */
            <button
              type='button'
              className='a-btn a-btn-danger mr-2'
              onClick={this.handleDeleteConnection}
            >
              {this.props.language.general.delete}
            </button>
            : null
          }
          <a onClick={this.props.cancelEdit}>
            {this.props.language.general.cancel}
          </a>
        </div>
      </div >
    );
  }

  public render() {
    return (
      <div className='modal-content'>
        <div className='modal-header a-modal-header'>
          <div className='a-iconText a-iconText-background a-iconText-large'>
            <div className='a-iconText-icon'>
              <i className='ai ai-corp a-icon' />
            </div>
            <h1 className='a-iconText-text mb-0'>
              <span className='a-iconText-text-large'>
                {this.props.language.ux_editor.modal_configure_api_header}
              </span>
            </h1>
          </div>
        </div>
        <div className='modal-body a-modal-body'>
          <this.renderSelectApiType />
          {this.state.apiType ?
            (this.state.apiType === 'codelist' ?
              <div>
                {this.renderSelectAPI(this.state.connection.codeListId, true)}
                <CodeListComponent
                  connectionId={this.state.connectionId}
                  connection={this.state.connection}
                  selectedApiDef={this.props.APIs.externalApisById[this.state.connection.externalApiId]}
                  dataModelElements={this.props.dataModelElements}
                  componentApiResponseMappingsById={this.state.componentApiResponseMappingsById}
                  componentApiResponseMappingsAllIds={this.state.componentApiResponseMappingsAllIds}
                  addMapping={this.addMapping}
                  handleMappingChange={this.handleMappingChange}
                  removeMapping={this.removeMapping}
                  language={this.props.language}
                />
              </div>
              :
              <div>
                {this.renderSelectAPI(this.state.connection.externalApiId, false)}
                <ExternalApiComponent
                  connectionId={this.state.connectionId}
                  connection={this.state.connection}
                  selectedApiDef={this.props.APIs.externalApisById[this.state.connection.externalApiId]}
                  dataModelElements={this.props.dataModelElements}
                  componentApiResponseMappingsById={this.state.componentApiResponseMappingsById}
                  componentApiResponseMappingsAllIds={this.state.componentApiResponseMappingsAllIds}
                  addMapping={this.addMapping}
                  handleMappingChange={this.handleMappingChange}
                  removeMapping={this.removeMapping}
                  handleClientParamsChange={this.handleClientParamsChange}
                  handleMetaParamsChange={this.handleMetaParamsChange}
                  language={this.props.language}
                />
              </div>
            )
            : null}
          <this.renderActionButtons />
        </div>
      </div>
    );
  }
}

const mapsStateToProps = (state: IAppState, props: IProvidedProps): IApiConfigurationProps => {
  return {
    connectionId: props.connectionId,
    saveEdit: props.saveEdit,
    cancelEdit: props.cancelEdit,
    deleteConnection: props.deleteConnection,
    APIs: state.serviceConfigurations.APIs,
    dataModelElements: state.appData.dataModel.model,
    codeLists: state.appData.codeLists.codeLists,
    language: state.appData.language.language,
  };
};

export const ApiConfigurationComponent = connect(mapsStateToProps)(ApiConfiguration);
