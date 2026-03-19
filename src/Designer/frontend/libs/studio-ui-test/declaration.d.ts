import '@testing-library/jest-dom';

declare global {
  interface DateConstructor {
    isFake: boolean;
  }
}
