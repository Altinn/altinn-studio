import { applyMiddleware, compose } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';

function setupMiddlewares(middlewares: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line global-require
    const { logger } = require('redux-logger');
    middlewares.push(logger);
    return composeWithDevTools(applyMiddleware(...middlewares));
  }
  return compose(applyMiddleware(...middlewares));
}

export default setupMiddlewares;
