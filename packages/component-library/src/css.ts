const unitlessKeys: Record<string, 1 | undefined> = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1,
};

const hyphenatePattern = /[A-Z]|^ms/g;

export type CssObject = {
  [key: string]: CssValue;
};

export type CssValue =
  | string
  | number
  | null
  | undefined
  | false
  | CssObject
  | CssValue[];

type CssInput = CssObject | CssValue[] | string | null | undefined | false;

const registered = new Map<string, CssObject[]>();
const inserted = new Set<string>();

function hash(text: string): string {
  let value = 5381;
  for (let index = 0; index < text.length; index++) {
    value = ((value << 5) + value) ^ text.charCodeAt(index);
  }
  return (value >>> 0).toString(36);
}

function isCssObject(value: CssValue): value is CssObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hyphenate(property: string): string {
  if (property.charCodeAt(1) === 45) return property;
  return property.replace(hyphenatePattern, '-$&').toLowerCase();
}

function declaration(property: string, value: string | number): string {
  const name = hyphenate(property);
  let printed =
    typeof value === 'number' &&
    value !== 0 &&
    unitlessKeys[property] !== 1 &&
    property.charCodeAt(1) !== 45
      ? `${value}px`
      : String(value);
  if (
    property === 'content' &&
    typeof value === 'string' &&
    !printed.startsWith('"') &&
    !printed.startsWith("'")
  ) {
    printed = `"${printed.replaceAll('"', '\\"')}"`;
  }
  return `${name}:${printed};`;
}

function childSelector(parent: string, key: string): string {
  if (key.includes('&')) return key.replaceAll('&', parent);
  if (
    key.startsWith(':') ||
    key.startsWith('[') ||
    key.startsWith('.') ||
    key.startsWith('#') ||
    key.startsWith('>') ||
    key.startsWith('+') ||
    key.startsWith('~')
  ) {
    return `${parent}${key}`;
  }
  return `${parent} ${key}`;
}

function serialize(selector: string, style: CssObject): string {
  let declarations = '';
  let nested = '';

  for (const key of Object.keys(style)) {
    const value = style[key];
    if (value == null || value === false) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null || item === false) continue;
        if (isCssObject(item)) {
          nested += serialize(selector, item);
        } else if (typeof item === 'string' || typeof item === 'number') {
          declarations += declaration(key, item);
        }
      }
      continue;
    }

    if (isCssObject(value)) {
      if (key.startsWith('@')) {
        nested += `${key}{${serialize(selector, value)}}`;
      } else {
        nested += serialize(childSelector(selector, key), value);
      }
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      declarations += declaration(key, value);
    }
  }

  return `${declarations ? `${selector}{${declarations}}` : ''}${nested}`;
}

function collect(input: CssValue | string, objects: CssObject[]): void {
  if (input == null || input === false || input === '') return;
  if (Array.isArray(input)) {
    for (const item of input) collect(item, objects);
    return;
  }
  if (typeof input === 'string' || typeof input === 'number') return;
  objects.push(input);
}

function insert(name: string, rules: string): void {
  if (inserted.has(name)) return;
  inserted.add(name);
  if (typeof document === 'undefined') return;
  const parent = document.head ?? document.documentElement;
  const existing = document.querySelector('[data-actual-css]');
  const element =
    existing instanceof HTMLStyleElement
      ? existing
      : document.createElement('style');
  if (element !== existing) {
    element.dataset.actualCss = '';
    parent.appendChild(element);
  }
  element.appendChild(document.createTextNode(rules));
}

function classFor(objects: CssObject[]): string {
  const body = objects.map(style => serialize('&', style)).join('');
  const name = `ac-${hash(body)}`;
  const rules = body.replaceAll('&', `.${name}`);
  registered.set(name, objects);
  insert(name, rules);
  return name;
}

export function css(...inputs: CssInput[]): string {
  const objects: CssObject[] = [];
  for (const input of inputs) collect(input, objects);
  if (objects.length === 0) return '';
  return classFor(objects);
}

export function cx(
  ...classNames: Array<string | null | undefined | false>
): string {
  const raw: string[] = [];
  const objects: CssObject[] = [];

  for (const className of classNames) {
    if (!className) continue;
    for (const token of className.split(/\s+/)) {
      if (!token) continue;
      const styles = registered.get(token);
      if (styles) {
        objects.push(...styles);
      } else {
        raw.push(token);
      }
    }
  }

  if (objects.length === 0) return raw.join(' ');
  const merged = classFor(objects);
  return raw.length > 0 ? `${raw.join(' ')} ${merged}` : merged;
}

export function keyframes(style: CssObject): string {
  const body = serialize('', style);
  const name = `animation-${hash(body)}`;
  insert(name, `@keyframes ${name}{${body}}`);
  return name;
}
