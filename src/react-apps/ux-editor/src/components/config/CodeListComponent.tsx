import * as React from 'react';
import { SelectDataModelComponent } from './SelectDataModelComponent';

export interface ICodeListComponentProps {
  connectionId: any;
  dataModelElements: any;
  connection: any;
  selectedApiDef: any;
  componentApiResponseMappingsById: any;
  componentApiResponseMappingsAllIds: any[];
  addMapping: () => void;
  handleMappingChange: (id: any, name: string, value: any) => void;
  removeMapping: (id: any) => void;
}

export interface ICodeListComponentState { }

export class CodeListComponent extends React.Component<ICodeListComponentProps, ICodeListComponentState> {

  public handleMappingChange = (id: any, mappingKey: any, e: any) => {
    const codes = { target: { value: 'codes' } };
    const key = { target: { value: 'key' } };

    this.props.handleMappingChange(id, 'resultObject', codes);
    this.props.handleMappingChange(id, 'valueKey', key);
    this.props.handleMappingChange(id, mappingKey, e);
  }

  public renderMappingView = (id: any): JSX.Element => {
    const valueKeys: string[] = ['value1', 'value2', 'value3'];
    const labelKey = this.props.componentApiResponseMappingsById[id].labelKey;

    return (
      <div>
        {this.props.connection && this.props.connection.codeListId ?
          <div className='row'>
            <div className='col-12 col'>
              <label>Label key</label>
              <select
                name='labelKey'
                onChange={this.handleMappingChange.bind(null, id, 'labelKey')}
                value={labelKey}
                className='custom-select a-custom-select'
              >
                <option value={''}>Choose label key</option>
                {valueKeys.map((key: any) => {
                  return (
                    <option key={key} value={key}>{key}</option>
                  );
                })}
              </select>
            </div>
          </div>
          : null
        }
      </div>
    );
  }

  public renderCodeListView = (): JSX.Element => {
    return (
      <div>
        {/* If API is selected */}
        {this.props.connection.codeListId ?
          <>
            {this.props.componentApiResponseMappingsAllIds.map((id: any) => {
              return (
                <div className='form-group a-form-group mb-2' key={id}>
                  <label className='a-form-label'>
                    Mappings
                        </label>
                  <div className='align-items-center row a-btn-action'>
                    <div className='col-10'>
                      {this.renderMappingView(id)}
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
          </>
          :
          // API ikke valgt
          null
        }
      </div>
    );
  }

  public render(): JSX.Element {
    return (this.renderCodeListView());
  }
}
