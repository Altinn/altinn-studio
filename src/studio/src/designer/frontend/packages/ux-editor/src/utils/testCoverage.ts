export const testFunction = (input: string): string => {
  const foo = 'bar';
  if (input === foo) {
    console.log('fooooo');
    return foo;
  }
  console.log('Hello');
  return 'Hello';
}
