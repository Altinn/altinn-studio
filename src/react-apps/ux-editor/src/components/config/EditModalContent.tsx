import * as React from 'react';
import { SelectDataModelComponent } from './SelectDataModelComponent';

export interface IEditModalContentProps {
  component: FormComponentType;
  dataModel?: IDataModelFieldElement[];
  textResources?: ITextResource[];
  saveEdit: (updatedComponent: FormComponentType) => void;
  cancelEdit: () => void;
}

export interface IEditModalContentState {
  component: IFormComponent;
}

export class EditModalContent extends React.Component<IEditModalContentProps, IEditModalContentState> {
  constructor(_props: IEditModalContentProps, _state: IEditModalContentState) {
    super(_props, _state);

    this.state = {
      component: _props.component,
    };
  }

  public handleSaveChanged = (): void => {
    this.props.saveEdit(this.state.component);
  }

  public handleDisabledChange = (e: any): void => {
    this.setState({
      component: {
        ...this.state.component,
        disabled: e.target.checked,
      },
    });
  }

  public handleRequiredChange = (e: any): void => {
    this.setState({
      component: {
        ...this.state.component,
        required: e.target.checked,
      },
    });
  }

  public handleTitleChange = (e: any): void => {
    this.setState({
      component: {
        ...this.state.component,
        title: e.target.value,
      },
    });
  }

  public handleDataModelChange = (e: any) => {
    const dataModelBinding = e.target.value;
    const title = this.getTextKeyFromDataModel(dataModelBinding);
    if (title) {
      this.setState({
        component: {
          ...this.state.component,
          dataModelBinding,
          title,
        },
      });
    } else {
      this.setState({
        component: {
          ...this.state.component,
          dataModelBinding,
        },
      });
    }
  }

  public handleAddOption = () => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options.push({
      label: 'label',
      value: 'value',
    });
    this.setState({
      component: updatedComponent,
    });
  }

  public handleRemoveOption = (index: number) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options.splice(index, 1);
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateOptionLabel = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].label = event.target.value;
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateOptionValue = (index: number, event: any) => {
    const updatedComponent: IFormComponent = this.state.component;
    updatedComponent.options[index].value = event.target.value;
    this.setState({
      component: updatedComponent,
    });
  }

  public handleUpdateHeaderSize = (size: string, event: any) => {
    const updatedComponent: IFormHeaderComponent = this.state.component as IFormHeaderComponent;
    updatedComponent.size = size;
    this.setState({
      component: updatedComponent,
    });
  }

  public getTextKeyFromDataModel = (dataBindingName: string): string => {
    const element: IDataModelFieldElement = this.props.dataModel.find(elem => elem.DataBindingName === dataBindingName);
    return element.Texts.Label;
  }

  public getTextResourceKeys = (): any[] => {
    if (!this.props.textResources) {
      return [];
    }

    return (this.props.textResources.map(resource => {
      return resource.id;
    }));
  }

  public renderComponentSpecificContent(): JSX.Element {
    switch (this.props.component.component) {
      case 'Header': {
        const component: IFormHeaderComponent = this.state.component as IFormHeaderComponent;
        return (
          <fieldset className={'form-group'}>
            <div
              className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
              onClick={this.handleUpdateHeaderSize.bind(this, 'S')}
            >
              <input
                type='radio'
                name={'radio-' + 'headerS-' + this.props.component.id}
                className='custom-control-input'
                checked={component.size === 'S'}
              />
              <label className='custom-control-label pl-3 a-radioButtons-title'>
                <h3>{'S'}</h3>
              </label>
            </div>
            <div
              className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
              onClick={this.handleUpdateHeaderSize.bind(this, 'M')}
            >
              <input
                type='radio'
                name={'radio-' + 'headerM-' + this.props.component.id}
                className='custom-control-input'
                checked={component.size === 'M'}
              />
              <label className='custom-control-label pl-3 a-radioButtons-title'>
                <h2>{'M'}</h2>
              </label>
            </div>
            <div
              className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
              onClick={this.handleUpdateHeaderSize.bind(this, 'L')}
            >
              <input
                type='radio'
                name={'radio-' + 'headerL-' + this.props.component.id}
                className='custom-control-input'
                checked={component.size === 'L'}
              />
              <label className='custom-control-label pl-3 a-radioButtons-title'>
                <h1>{'L'}</h1>
              </label>
            </div>
          </fieldset>
        );
      }
      case 'Input': {
        const component: IFormInputComponent = this.state.component as IFormInputComponent;
        return (
          <div className='form-group a-form-group mt-2'>
            <div className='custom-control custom-control-stacked pl-0 custom-checkbox a-custom-checkbox'>
              <input
                type={'checkbox'}
                value={component.disabled ? 'true' : 'false'}
                onChange={this.handleDisabledChange}
                className='custom-control-input'
                checked={component.disabled ? true : false}
                name={'InputIsDisabled'}
                id={'InputIsDisabled'}
              />
              <label className='pl-3 custom-control-label a-fontBold' htmlFor='InputIsDisabled'>
                Disabled</label>
            </div>
            <div className='custom-control custom-control-stacked pl-0 custom-checkbox a-custom-checkbox'>
              <input
                type={'checkbox'}
                value={component.required ? 'true' : 'false'}
                onChange={this.handleRequiredChange}
                className='custom-control-input'
                checked={component.required ? true : false}
                name={'InputIsRequired'}
                id={'InputIsRequired'}
              />
              <label className='pl-3 custom-control-label a-fontBold' htmlFor='InputIsRequired'>
                Required</label>
            </div>
          </div>
        );
      }
      case 'RadioButtons': {
        const component: IFormRadioButtonComponent = this.state.component as IFormRadioButtonComponent;
        return (
          <div className='form-group a-form-group mt-2'>
            <h2 className='a-h4'>Options</h2>
            <div className='row align-items-center'>
              <div className='col-5'>
                <label className='a-form-label'>Label</label>
              </div>
              <div className='col-5'>
                <label className='a-form-label'>Value</label>
              </div>
            </div>
            {component.options.map((option, index) => (
              <div key={index} className='row align-items-center'>
                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionLabel.bind(this, index)}
                    value={option.label}
                    className='form-control'
                    type='text'
                  />
                </div>
                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionValue.bind(this, index)}
                    value={option.value}
                    className='form-control'
                    type='text'
                  />
                </div>
                <div className='col-2'>
                  <button
                    type='button'
                    className='a-btn a-btn-icon'
                    onClick={this.handleRemoveOption.bind(this, index)}
                  >
                    <i className='ai ai-circle-exit a-danger ai-left' />
                  </button>
                </div>
              </div>
            ))}
            <div className='row align-items-center mb-1'>
              <div className='col-4 col'>
                <button type='button' className='a-btn' onClick={this.handleAddOption}>
                  Add new option
                </button>
              </div>
              <div />
            </div>
          </div>
        );
      }
      case 'Dropdown': {
        const component: IFormDropdownComponent = this.state.component as IFormDropdownComponent;
        return (
          <div className='form-group a-form-group mt-2'>
            <h2 className='a-h4'>Options</h2>
            <div className='row align-items-center'>
              <div className='col-5'>
                <label className='a-form-label'>Label</label>
              </div>
              <div className='col-5'>
                <label className='a-form-label'>Value</label>
              </div>
            </div>
            {component.options.map((option, index) => (
              <div key={index} className='row align-items-center'>
                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionLabel.bind(this, index)}
                    value={option.label}
                    className='form-control'
                    type='text'
                  />
                </div>
                <div className='col-5'>
                  <input
                    onChange={this.handleUpdateOptionValue.bind(this, index)}
                    value={option.value}
                    className='form-control'
                    type='text'
                  />
                </div>
                <div className='col-2'>
                  <button
                    type='button'
                    className='a-btn a-btn-icon'
                    onClick={this.handleRemoveOption.bind(this, index)}
                  >
                    <i className='ai ai-circle-exit a-danger ai-left' />
                  </button>
                </div>
              </div>
            ))}
            <div className='row align-items-center mb-1'>
              <div className='col-4 col'>
                <button type='button' className='a-btn' onClick={this.handleAddOption}>
                  Add new option
                </button>
              </div>
              <div />
            </div>
          </div>
        );
      }

      case 'Submit': {
        return (
          <div className='form-group a-form-group'>
            <label className='a-form-label'>Text Key</label>
            <input
              type='text'
              disabled={true}
              value={this.props.component.textResourceId}
              className='form-control'
            />
          </div>
        );
      }

      default: {
        return null;
      }
    }
  }

  public renderSelectDataBinding = (componentType: string): JSX.Element => {
    return (this.shouldComponentDataBind(componentType) ?
      (
        <SelectDataModelComponent
          onDataModelChange={this.handleDataModelChange}
          selectedElement={this.state.component.dataModelBinding}
        />) : null);
  }

  public renderTextResourceOptions = (): JSX.Element[] => {
    if (!this.props.textResources) {
      return null;
    }

    return (
      this.props.textResources.map((resource, index) => {
        return (
          <option key={index} value={resource.id}>
            {resource.value}
          </option>
        );
      }));
  }

  public render(): JSX.Element {
    return (
      <div className='modal-content'>
        <div className='modal-header a-modal-header'>
          <div className='a-iconText a-iconText-background a-iconText-large'>
            <div className='a-iconText-icon'>
              <i className='ai ai-corp a-icon' />
            </div>
            <h1 className='a-iconText-text mb-0'>
              <span className='a-iconText-text-large'>Edit properties</span>
            </h1>
          </div>
        </div>
        <div className='modal-body a-modal-body'>
          <div className='form-group a-form-group'>
            <label htmlFor={'editModal_text'} className='a-form-label'>Text</label>
            <select
              id={'editModal_text'}
              value={this.state.component.customType === 'Standard' ?
                this.state.component.textResourceId : this.state.component.title}
              onChange={this.handleTitleChange}
              className='custom-select a-custom-select'
              disabled={this.state.component.customType === 'Standard'}
            >
              <option key={'empty'} value={''}>
                Choose text
              </option>
              {this.renderTextResourceOptions()}
            </select>
          </div>
          {this.renderComponentSpecificContent()}
          {this.renderSelectDataBinding(this.state.component.component)}
          <div className='row mt-3'>
            <div className='col'>
              <button type='submit' className='a-btn a-btn-success mr-2' onClick={this.handleSaveChanged}>Save</button>
              <a className='mr-2' onClick={this.props.cancelEdit}>Cancel</a>
            </div>
          </div>
        </div>
      </div >
    );
  }

  private shouldComponentDataBind = (componentType: string): boolean => {
    switch (componentType) {
      case ('Input'):
      case ('Checkboxes'):
      case ('TextArea'):
      case ('RadioButtons'):
      case ('Dropdown'): {
        return true;
      }

      default: {
        return false;
      }
    }
  }
}
