import 'react-router';

declare module 'react-router' {
  interface Future {
    v8_middleware: true;
  }
}
