/** used to compose functions */
export function flow(...fns: Function[]) {
  return (input: any) => fns.reduce((result, fn) => fn(result), input);
}
