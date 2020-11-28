import { Interpreter } from './interpreter';

describe('Interpreter', () => {
  let e: Interpreter;

  beforeEach(() => {
    e = Interpreter.create();
  });

  it('Test1', async () => {
    expect(e).toBe(e);
  });
  
});
