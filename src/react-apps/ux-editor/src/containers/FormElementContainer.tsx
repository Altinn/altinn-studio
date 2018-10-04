import * as React from 'react';

export interface IFormComponentHandlerProps {
  id: string;
}

export const formComponentWithHandlers = (Component: React.ComponentType<any>): React.ComponentType<IFormComponentHandlerProps> => {
  const handleDataUpdate = (id: string, data: any) => console.log(`ComponentId-${id} Updated with data=${data}`)

  return class FormComponentWithHandlers extends React.Component<IFormComponentHandlerProps> {
    public render(): JSX.Element {
      const { id, ...passThroughProps } = this.props;
      return (
        <Component {...passThroughProps} onUpdate={handleDataUpdate.bind(null, id)} />
      )
    }
  }
}

export interface IInputProps {
  onUpdate: (value: string) => void;
}

export interface IInputState {
  value: string;
}

class InputComponent
  extends React.Component<IInputProps, IInputState> {

  constructor(props: IInputProps) {
    super(props);

    this.state = { value: '' };
  }

  onHandleDataChange = (event: any) => this.setState({ value: event.target.value });

  onHandleOnBlur = () => this.props.onUpdate(this.state.value);

  public render() {
    return (
      <input
        onBlur={this.onHandleOnBlur}
        onChange={this.onHandleDataChange}
      />
    );
  }
}

export const TestComponent = formComponentWithHandlers(InputComponent);