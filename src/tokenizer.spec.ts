import { Tokenizer } from './tokenizer';

describe('TokensIterator', () => {

  it('53 + 23', () => {
    const r = Tokenizer.splitAll('53 + 23');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('53|+|23');
  });

  it('print("Hello, World!")', () => {
    const r = Tokenizer.splitAll('print("Hello, World!")');
    expect(r.length).toBe(1);
    expect(r.join('|')).toBe('print("Hello, World!")');
  });

  it('print("Hello ""),)"" World!")', () => {
    const r = Tokenizer.splitAll('print("Hello, World!")');
    expect(r.length).toBe(1);
    expect(r.join('|')).toBe('print("Hello, World!")');
  });

  it('y = x + 23', () => {
    const r = Tokenizer.splitAll('y = x + 23');
    expect(r.length).toBe(5);
    expect(r.join('|')).toBe('y|=|x|+|23');
  });

  it('"this is test" + " another string"', () => {
    const r = Tokenizer.splitAll('"this is test" + " another string"');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('"this is test"|+|" another string"');
  });

  it('x = ""', () => {
    const r = Tokenizer.splitAll('x = ""');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('x|=|""');
  });

  it('func(x, y) + x', () => {
    const r = Tokenizer.splitAll('func(x, y) + x');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('func(x, y)|+|x');
  });

  it('func(x, y, anotherFunc(x, y)) + x', () => {
    const r = Tokenizer.splitAll('func(x, y, anotherFunc(x, y)) + x');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('func(x, y, anotherFunc(x, y))|+|x');
  });

  it('func(x, y, "1 1)") + x', () => {
    const r = Tokenizer.splitAll('func(x, y, "1 1)") + x');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('func(x, y, "1 1)")|+|x');
  });


  it('json = {"f1" : 33}', () => {
    const r = Tokenizer.splitAll('json = {"f1" : 33}');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('json|=|{"f1" : 33}');
  });

  it('json = ["f1", "33"]', () => {
    const r = Tokenizer.splitAll('json = ["f1", "33"]');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('json|=|["f1", "33"]');
  });

  it('json = ["f1", "((33"]', () => {
    const r = Tokenizer.splitAll('json = ["f1", "((33"]');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('json|=|["f1", "((33"]');
  });

  it('{"x":88, "y" : "test"}, {"x":99,"y":"test 99"}', () => {
    const r = Tokenizer
      .splitAll('{"x":88, "y" : "test"}, {"x":99,"y":"test 99"}', [' ', ',']);
    expect(r.length).toBe(2);
    expect(r.join('|')).toBe('{"x":88, "y" : "test"}|{"x":99,"y":"test 99"}');
  });

  it('"this \"is\" test" + " another string"', () => {
    const r = Tokenizer.splitAll('"this \"is\" test" + " another string"');
    expect(r.length).toBe(3);
    expect(r.join('|')).toBe('"this \"is\" test"|+|" another string"');
  });

});

describe('Lines counter', () => {
  it('Empty lines', () => {
    let lines = Tokenizer.splitCodeLines([
      '',
      'x = 5',
      '',
      'x + x'
    ].join('\n'));

    expect(lines.length).toBe(2);
    expect(lines[0].line).toBe('x = 5');
    expect(lines[0].start).toBe(2);
    expect(lines[0].end).toBe(2);
    expect(lines[1].line).toBe('x + x');
    expect(lines[1].start).toBe(4);
    expect(lines[1].end).toBe(4);

    lines = Tokenizer.splitCodeLines([
      '',
      'x = {',
      '  "s": 5',
      '}',
      '',
      'x + x'
    ].join('\n'));

    expect(lines.length).toBe(2);
    expect(lines[1].line).toBe('x + x');
    expect(lines[1].start).toBe(6);
    expect(lines[1].end).toBe(6);

    lines = Tokenizer.splitCodeLines([
      '',
      'x = " this is',
      '  a valid multiline',
      'string"',
      '',
      'x + x'
    ].join('\n'));

    expect(lines.length).toBe(2);
    expect(lines[1].line).toBe('x + x');
    expect(lines[1].start).toBe(6);
    expect(lines[1].end).toBe(6);

    lines = Tokenizer.splitCodeLines([
      '',
      '# comment!',
      'x = " this is',
      '  a valid multiline',
      'string"',
      '',
      'x + x'
    ].join('\n'));

    expect(lines.length).toBe(2);
    expect(lines[1].line).toBe('x + x');
    expect(lines[1].start).toBe(7);
    expect(lines[1].end).toBe(7);
  });

});

describe('Test imports', () => {
  it('import', () => {
    const importLines = [
      'import packageN1',
      'import packageN2 as pN2',
      'from packageN1 import prop',
      'from packageN2 import prop as p',
      'from packageN3 import prop1 as p1, prop2',
    ];

    const packages = Tokenizer.getPackagesList(importLines);

    expect(packages.length).toBe(5);

    expect(packages[0].name).toBe('packageN1');
    expect(packages[0].properties).toBe(undefined);
    expect(packages[0].as).toBe(undefined);

    expect(packages[1].name).toBe('packageN2');
    expect(packages[1].properties).toBe(undefined);
    expect(packages[1].as).toBe('pN2');

    expect(packages[2].name).toBe('packageN1');
    const props2 = packages[2].properties;
    expect(props2.length).toBe(1);
    expect(props2[0].name).toBe('prop');
    expect(props2[0].as).toBe(undefined);
    expect(packages[2].as).toBe(undefined);

    expect(packages[3].name).toBe('packageN2');
    const props3 = packages[3].properties;
    expect(props3.length).toBe(1);
    expect(props3[0].name).toBe('prop');
    expect(props3[0].as).toBe('p');
    expect(packages[3].as).toBe(undefined);

    expect(packages[4].name).toBe('packageN3');
    const props4 = packages[4].properties;
    expect(props4.length).toBe(2);
    expect(props4[0].name).toBe('prop1');
    expect(props4[0].as).toBe('p1');
    expect(props4[1].name).toBe('prop2');
    expect(props4[1].as).toBe(undefined);
    expect(packages[4].as).toBe(undefined);
  })
});


  // there is no escape symbol for \"

  // it('"this ""is test" + " another string"', () => {
  //   const r = Tokenizer.splitAll('"this ""is test" + " another string"');
  //   expect(r.length).toBe(3);
  //   expect(r.join('|')).toBe('"this ""is test"|+|" another string"');
  // });

