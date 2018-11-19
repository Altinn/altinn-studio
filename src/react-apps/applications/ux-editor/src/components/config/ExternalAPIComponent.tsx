import * as React from 'react';
import * as networking from '../../utils/networking';
import { SelectDataModelComponent } from './SelectDataModelComponent';

export interface IExternalApiComponentProps {
  connectionId: any;
  dataModelElements: any;
  connection: any;
  selectedApiDef: any;
  componentApiResponseMappingsById: any;
  componentApiResponseMappingsAllIds: any[];
  addMapping: () => void;
  handleMappingChange: (id: any, name: string, e: any) => void;
  removeMapping: (id: any) => void;
  handleClientParamsChange: (name: any, value: any) => void;
  handleMetaParamsChange: (e: any) => void;
}

export interface IExternalApiComponentState {
  apiResponse: any;
  formDataApiTest: any;
}

export class ExternalApiComponent extends React.Component<IExternalApiComponentProps, IExternalApiComponentState> {
  constructor(_props: IExternalApiComponentProps, _state: IExternalApiComponentState) {
    super(_props, _state);
    this.state = {
      apiResponse: null,
      formDataApiTest: null,
    };
  }

  public componentDidMount() {
    const { clientParams, metaParams } = this.props.connection;
    const formData: any = {};
    if (clientParams) {
      for (const key of Object.keys(clientParams)) {
        formData[key] = clientParams[key];
      }
    }

    if (metaParams) {
      for (const key of Object.keys(metaParams)) {
        formData[key] = metaParams[key];
      }
    }

    this.setState((prevState) => {
      return {
        ...prevState,
        formDataApiTest: formData,
      };
    });
  }

  public handleformDataChange = (e: any): void => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const name = e.target.name;

    this.setState({
      formDataApiTest: {
        ...this.state.formDataApiTest,
        [name]: value,
      },
    });
  }

  public handleClientParamsChange = (e: any): void => {
    const name = e.target.name;
    const value = e.target.value;
    this.handleformDataChange(e);
    this.props.handleClientParamsChange(name, value);
  }

  public handleMetaParamsChange = (e: any): void => {
    this.handleformDataChange(e);
    this.props.handleMetaParamsChange(e);
  }

  public triggerApi = (e: any) => {
    let uri: string = this.props.selectedApiDef.uri;

    // Insert client params from form
    Object.keys(this.state.formDataApiTest).forEach((key) => {
      uri += `${key}=${this.state.formDataApiTest[key]}&`;
    });

    // Insert meta params from "connection"
    Object.keys(this.props.connection.metaParams).forEach((key) => {
      this.props.selectedApiDef.metaParams[key].urlEncode === true ?
        uri += `${key}=${encodeURI(this.props.connection.metaParams[key])}&`
        :
        uri += `${key}=${this.props.connection.metaParams[key]}&`;
    });

    networking.get(uri)
      .then((response) => {
        this.setState(
          { apiResponse: response },
        );
      })
      .catch((error) => {
        this.setState(
          { apiResponse: error },
        );
      });
  }

  public fetchFromApiButton = (): JSX.Element => {
    let checkForFetch: boolean = false;
    let readyToFetch: boolean = false;
    const { clientParams, metaParams } = this.props.selectedApiDef;
    const mandatoryClientParams: any =
      Object.keys(clientParams).filter(
        (key) => clientParams[key].required === true);
    const mandatoryMetaParams: any =
      Object.keys(metaParams).filter(
        (key) => metaParams[key].required === true);
    const mandatoryParams: any = mandatoryClientParams.concat(mandatoryMetaParams);

    this.state.formDataApiTest ? checkForFetch = true : checkForFetch = false;

    if (checkForFetch === true) {
      const insertedRequiredParams: any =
        mandatoryParams.filter(
          (param: any) => this.state.formDataApiTest[param] !== ''
            && Object.keys(this.state.formDataApiTest).length >= mandatoryParams.length);
      insertedRequiredParams.length >= mandatoryParams.length ? readyToFetch = true : readyToFetch = false;
    }

    return (
      <>
        <div className='mt-2'>
          {readyToFetch === true ?
            <button
              type='button'
              className='a-btn a-btn-success'
              onClick={this.triggerApi}
            >
              Fetch from API using parameters
            </button>
            :
            <button
              type='button'
              className='a-btn disabled'
              disabled={true}
            >
              One or more client params is missing to fetch from API.
            </button>
          }
        </div>
      </>
    );
  }

  public renderClientParams = (clientParams: any, clientParamValues: any): JSX.Element => {
    if (!clientParams || Object.keys(clientParams).length === 0) {
      return null;
    }
    const selectedDataModelElement = !clientParamValues ? '' : clientParamValues;
    return (
      <div>
        {Object.keys(clientParams).map((key) => {
          return (
            <div className='form-group a-form-group mt-2' key={key}>
              <h2 className='a-h4'>
                ClientParam: {clientParams[key].name}
              </h2>
              <div className='align-items-center row mt-1'>
                <div className='col-12 col'>
                  <label className='a-form-label' htmlFor={clientParams[key].name}>
                    Enter for API test:
                      </label>
                  <input
                    id={clientParams[key].name}
                    name={clientParams[key].name}
                    type='text'
                    className='form-control'
                    width={10}
                    placeholder={clientParams[key].example}
                    onChange={this.handleformDataChange}
                    required={true}
                  />
                </div>
              </div>
              <div className='align-items-center row mt-1'>
                <div className='col-12 col'>
                  <SelectDataModelComponent
                    onDataModelChange={this.props.handleClientParamsChange.bind(null, clientParams[key].name)}
                    selectedElement={selectedDataModelElement}
                    hideRestrictions={true}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  public renderMetaParams = (metaParams: any, metaParamValues: any): JSX.Element => {
    return (
      <div>
        {Object.keys(metaParams).map((key) => {
          return (
            <div className='form-group a-form-group mt-2' key={key}>
              <h2 className='a-h4'>
                MetaParam: {metaParams[key].name}
              </h2>
              <div className='align-items-center row mt-1'>
                <div className='col-12 col'>
                  <label className='a-form-label' htmlFor={metaParams[key].name}>
                    Enter metaparam:
                            </label>
                  <input
                    id={metaParams[key].name}
                    name={metaParams[key].name}
                    type='text'
                    className='form-control'
                    width={10}
                    placeholder={metaParams[key].example}
                    onChange={this.handleMetaParamsChange}
                    value={!metaParamValues
                      ? '' : metaParamValues[metaParams[key].name]}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  public renderMappingView = (apiResponse: any, id: any, codelist: boolean = false): JSX.Element => {
    const resultObject = this.props.componentApiResponseMappingsById[id].resultObject;
    const valueKey = this.props.componentApiResponseMappingsById[id].valueKey;
    const labelKey = this.props.componentApiResponseMappingsById[id].labelKey;

    return (
      <div>
        <div className='row'>
          <div className='col-6 col'>
            <label>Object</label>
            <select
              name='resultObject'
              onChange={this.props.handleMappingChange.bind(null, id, 'resultObject')}
              value={resultObject}
              className='custom-select a-custom-select'
            >
              <option value={''}>Velg objekt:</option>
              {apiResponse ? Object.keys(apiResponse).map((key) => {
                return (
                  <option key={key} value={key} >{key}</option>
                );
              })
                :
                <option value={''}>{'Ingen objekter å presentere...'}</option>
              }
            </select>
          </div>
          <div className='col-6 form-group a-form-group disabled'>
            <label>Result</label>
            <input
              type='text'
              placeholder={JSON.stringify(resultObject)}
              className='form-control'
              disabled={true}
            />
          </div>
        </div>
        {this.props.selectedApiDef && this.props.selectedApiDef.type === 'list' ?
          <div className='row'>
            <div className='col-6 col'>
              <label>Value key</label>
              <select
                name='valueKey'
                onChange={this.props.handleMappingChange.bind(null, id, 'valueKey')}
                value={valueKey}
                className='custom-select a-custom-select'
              >
                <option value={''}>Choose code key</option>
                {resultObject && apiResponse[resultObject] && apiResponse[resultObject].length > 0 ?
                  Object.keys(apiResponse[resultObject][0]).map((key: any) => {
                    return (
                      <option key={key} value={key}>{key}</option>
                    );
                  }) :
                  <option value={''}>{'Ingen objekter å presentere...'}</option>
                }
              </select>
            </div>
            <div className='col-6 col'>
              <label>Label key</label>
              <select
                name='labelKey'
                onChange={this.props.handleMappingChange.bind(null, id, 'labelKey')}
                value={labelKey}
                className='custom-select a-custom-select'
              >
                <option value={''}>Choose label key</option>
                {resultObject && apiResponse[resultObject] && apiResponse[resultObject].length > 0 ?
                  Object.keys(apiResponse[resultObject][0]).map((key: any) => {
                    return (
                      <option key={key} value={key}>{key}</option>
                    );
                  }) :
                  <option value={''}>{'Ingen objekter å presentere...'}</option>
                }
              </select>
            </div>
          </div>
          : null
        }
      </div>
    );
  }

  public renderExternalAPIView = (): JSX.Element => {
    const { apiResponse } = this.state;
    const { metaParams, clientParams } = this.props.connection;
    return (
      <div>
        {/* If API is selected */}
        {this.props.connection.externalApiId ?
          <>
            {/* TEST API SECTION. Mapping through all parameters */}
            <>
              {/* Client Parameters */}
              {this.renderClientParams(this.props.selectedApiDef.clientParams, clientParams)}

              {/* Meta Parameters */}
              {this.renderMetaParams(this.props.selectedApiDef.metaParams, metaParams)}

              {/* Fetch test response from API */}
              <this.fetchFromApiButton />

              <div className='form-group a-form-group mt-2'>
                <label className='a-form-label' htmlFor='exampleText'>API Response</label>
                <textarea
                  name='text'
                  id='exampleText'
                  className='form-control a-textarea'
                  value={JSON.stringify(this.state.apiResponse, null, 2)}
                  readOnly={true}
                  rows={10}
                />
              </div>

              {apiResponse ? (
                <div className='form-group a-form-group mt-2'>
                  <div className='row align-items-center'>
                    <div className='col-12'>
                      <label className='a-form-label'>
                        Mappings
                        </label>
                    </div>
                  </div>
                  {this.props.componentApiResponseMappingsAllIds.map((id: any) => {
                    return (
                      <div className='form-group a-form-group mb-2' key={id}>
                        <div className='align-items-center row  a-btn-action'>
                          <div className='col-10'>
                            {this.renderMappingView(apiResponse, id)}
                            <div className='row'>
                              <div className='col-12'>
                                <SelectDataModelComponent
                                  onDataModelChange={this.props.handleMappingChange.bind(null, id, 'mappingObject')}
                                  selectedElement={this.props.componentApiResponseMappingsById[id].mappingObject}
                                  hideRestrictions={true}
                                />
                              </div>
                            </div>
                          </div>
                          <div className='col-2'>
                            <button
                              type='button'
                              className='a-btn a-btn-icon'
                              onClick={this.props.removeMapping.bind(null, id)}
                            >
                              <i className='ai ai-circle-exit a-danger ai-left' />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className='align-items-center row'>
                    <div className='col-6 col'>
                      <button
                        type='button'
                        className='a-btn'
                        onClick={this.props.addMapping}
                      >
                        Add new mapping
                      </button>
                    </div>
                  </div>
                </div>
              ) :
                <div id='alert' className='a-message a-message--arrow-off a-message-info mb-1' role='alert'>
                  Fetch from API to configure API response mapping.
                  </div>
              }

            </>
          </>
          :
          // API ikke valgt
          null
        }

      </div>
    );
  }

  public render(): JSX.Element {
    return (this.renderExternalAPIView());
  }
}
