import { v4 as uuidv4 } from 'uuid';

export type ErrorList = { [path: string]: string[] };

export interface PrettyErrorsOptions {
  input: any;
  errors?: ErrorList;
  indentation?: number;
}

export interface PrettyErrorsOptionsStyling {
  defaultStyle?: string;
}

interface In {
  obj: any;
  errors: ErrorList;
  path: string[];
  css: { [unique: string]: { original: string; style: string } } | undefined;
}

type RecursiveLines = (string | RecursiveLines)[];

interface Out {
  lines: RecursiveLines;
  start: string;
  end: string;
  inline: boolean;
  errors: string[];
}

function trimTrailingComma(str: string): string {
  return str.replace(/,$/, '');
}

function trimLastTrailingComma(lines: RecursiveLines) {
  const lastIdx = lines.length - 1;
  if (typeof lines[lastIdx] === 'string') {
    lines[lastIdx] = trimTrailingComma(lines[lastIdx] as string);
  }
}

const cssRegex = /(\{css:[a-f0-9]+})/g;

function style(text: string, style: string, input: In): string {
  if (input.css !== undefined) {
    const uuid = `{css:${uuidv4().replaceAll('-', '')}}`;
    input.css[uuid] = {
      original: text,
      style,
    };
    return uuid;
  }

  return text;
}

function errorLines(input: In): string[] {
  const stringPath = input.path.join('.');
  if (input.errors[stringPath] && input.errors[stringPath].length) {
    return input.errors[stringPath].map((err) =>
      [style('→', 'color: red; font-weight: bold;', input), style(err, 'color: red; font-style: italic;', input)].join(
        ' ',
      ),
    );
  }

  return [];
}

function prettyJsonSerializable(input: In): Out {
  const { obj } = input;
  const value = JSON.stringify(obj);
  const errors = errorLines(input);

  return {
    lines: [`${value},`],
    start: '',
    end: '',
    inline: true,
    errors,
  };
}

function inline(out: Out): RecursiveLines {
  const newLines: RecursiveLines = [];
  if (out.start) {
    if (out.lines.length === 1) {
      newLines.push(`${out.start}${out.lines[0]}${out.end}`);
    } else {
      newLines.push(`${out.start}${out.lines.map(trimTrailingComma).join(', ')}${out.end}`);
    }
  } else {
    newLines.push(...out.lines);
  }

  return newLines;
}

function appendErrors(input: In, out: Out, lineLength?: number): RecursiveLines {
  const lines: RecursiveLines = [];
  if (out.errors.length) {
    let lastLineLength = lineLength || 1;
    const lastLineIdx = out.lines.length - 1;
    if (lineLength === undefined && !out.end && typeof out.lines[lastLineIdx] === 'string') {
      lastLineLength = trimTrailingComma(out.lines[lastLineIdx] as string).length + (out.inline ? out.start.length : 0);
    }

    lines.push(style('~'.repeat(lastLineLength), 'color: red;', input), ...out.errors);
  }

  return lines;
}

function postProcessObjectLike(input: In, results: Out[], out: Omit<Out, 'lines' | 'errors'>): Out {
  const newLines: RecursiveLines = [];
  for (const idx in results) {
    const result = results[idx];
    let fixedErrorLength: number | undefined;
    if (result.inline) {
      const lines = inline(result);
      fixedErrorLength = trimTrailingComma(lines[0] as string).length;
      newLines.push(...lines);
    } else {
      result.start && newLines.push(result.start);
      newLines.push(result.lines);
      result.end && newLines.push(result.end);
    }
    if (parseInt(idx) === results.length - 1) {
      trimLastTrailingComma(newLines);
    }
    newLines.push(...appendErrors(input, result, fixedErrorLength));
  }

  const errors = errorLines(input);
  return { ...out, lines: newLines, errors };
}

function prettyArray(input: In): Out {
  const { obj, path } = input;
  const parentPath = [...path];
  const ourKey = parentPath.pop() || '';

  const results: Out[] = [];
  let oneLiner = obj.length <= 5;
  for (const idx in obj) {
    const currentPath = [...parentPath, `${ourKey}[${idx}]`];
    const result = prettyErrorsRecursive({
      ...input,
      obj: obj[idx],
      path: currentPath,
    });
    oneLiner = oneLiner && result.inline && result.errors.length === 0;
    results.push(result);
  }

  return postProcessObjectLike(input, results, {
    start: '[',
    end: '],',
    inline: oneLiner,
  });
}

function prettyObject(input: In): Out {
  const { obj, path } = input;

  const results: Out[] = [];
  let oneLiner = Object.keys(obj).length <= 3;
  for (const key of Object.keys(obj)) {
    const currentPath = [...path, key];
    const result = prettyErrorsRecursive({
      ...input,
      obj: obj[key],
      path: currentPath,
    });
    oneLiner = oneLiner && result.inline && result.errors.length === 0;
    result.start = `${key}: ${result.start}`;
    results.push(result);
  }

  return postProcessObjectLike(input, results, {
    start: '{',
    end: '},',
    inline: oneLiner,
  });
}

function prettyErrorsRecursive(input: In): Out {
  if (typeof input.obj === 'object') {
    if (input.obj === null) {
      return prettyJsonSerializable(input);
    }

    if (Array.isArray(input.obj)) {
      return prettyArray(input);
    }

    return prettyObject(input);
  }

  return prettyJsonSerializable(input);
}

function indent(lines: RecursiveLines, level: number): string[] {
  const indentation = '  '.repeat(level);
  const returnVal: string[] = [];

  for (const lineOrLines of lines) {
    if (typeof lineOrLines === 'string') {
      returnVal.push(`${indentation}${lineOrLines}`);
    } else {
      returnVal.push(...indent(lineOrLines, level + 1));
    }
  }

  return returnVal;
}

function postProcessOuterObject(input: In, out: Out, level: number): string[] {
  trimLastTrailingComma(out.lines);

  const lines = out.inline
    ? [...inline(out), ...appendErrors(input, out)]
    : out.start
    ? [out.start, out.lines, trimTrailingComma(out.end), ...appendErrors(input, out)]
    : [...out.lines, ...appendErrors(input, out)];

  return indent(lines, level);
}

/**
 * Pretty-prints errors tied to some keys/values in any object
 */
export function prettyErrors({ input, errors, indentation }: PrettyErrorsOptions): string {
  const i: In = {
    obj: input,
    errors: errors || {},
    path: [],
    css: undefined,
  };
  const out = prettyErrorsRecursive(i);
  return postProcessOuterObject(i, out, indentation || 0).join('\n');
}

/**
 * The same as above, but prepares a colored output which can be passed to console.log() with color support
 */
export function prettyErrorsToConsole({
  input,
  errors,
  indentation,
  defaultStyle,
}: PrettyErrorsOptions & PrettyErrorsOptionsStyling): {
  lines: string;
  css: string[];
} {
  const css: In['css'] = {};
  const i: In = {
    obj: input,
    errors: errors || {},
    path: [],
    css,
  };
  const cssList = [defaultStyle || ''];
  const out = prettyErrorsRecursive(i);
  const lines = postProcessOuterObject(i, out, indentation || 0)
    .join('\n')
    .replaceAll(cssRegex, (match) => {
      cssList.push(css[match].style);
      cssList.push(defaultStyle || '');
      return `%c${css[match].original}%c`;
    });

  return { lines: `%c${lines}`, css: cssList };
}
