import { describe, expect, it } from 'vitest';

import { css, cx, keyframes } from './css';

function rulesFor(className: string): string {
  const style = document.querySelector('[data-actual-css]');
  return style?.textContent ?? '';
}

describe('css', () => {
  it('prints nested selectors, media queries, and unitless numbers', () => {
    const className = css({
      display: 'flex',
      margin: 0,
      padding: 4,
      fontWeight: 500,
      opacity: 0.5,
      WebkitLineClamp: 2,
      '&:hover': { color: 'red' },
      '@media (max-width: 400px)': { flexDirection: 'column' },
    });

    const rules = rulesFor(className);
    expect(rules).toContain(
      `.${className}{display:flex;margin:0;padding:4px;font-weight:500;opacity:0.5;-webkit-line-clamp:2;}`,
    );
    expect(rules).toContain(`.${className}:hover{color:red;}`);
    expect(rules).toContain(
      `@media (max-width: 400px){.${className}{flex-direction:column;}}`,
    );
  });

  it('lets the later class win when cx merges registered styles', () => {
    const first = css({ color: 'red', padding: 2 });
    const second = css({ color: 'blue' });
    const merged = cx(first, 'tailwind', second).split(' ').at(-1) ?? '';

    expect(cx(first, 'tailwind', second)).toContain('tailwind');
    expect(rulesFor(merged)).toContain(
      `.${merged}{color:red;padding:2px;}.${merged}{color:blue;}`,
    );
  });

  it('emits a keyframes name', () => {
    const name = keyframes({
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    });

    expect(name.startsWith('animation-')).toBe(true);
    expect(rulesFor(name)).toContain(`@keyframes ${name}{`);
    expect(rulesFor(name)).toContain('opacity:0;');
    expect(rulesFor(name)).toContain('opacity:1;');
  });
});
