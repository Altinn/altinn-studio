import * as React from 'react';
import actions from './features/form/FormData/actions';

function Counter() {
  const [count, setCount] = React.useState(0);

  function countChange(modifier: number, event: any) {
    setCount(count + modifier);
    actions.updateFormDataFulfilled('count', count);
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={countChange.bind(null, 1)}>+</button>
      <button onClick={countChange.bind(null, -1)}>-</button>
    </div>
  )
}

export default Counter;