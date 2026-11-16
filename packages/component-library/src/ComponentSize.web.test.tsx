import { render, screen } from '@testing-library/react';

import { Button } from './Button';
import { BigInput, Input } from './Input';
import { Text } from './Text';

// jsdom's getComputedStyle does not evaluate media queries, so the base
// (narrow) values always win there. Responsive steps are asserted
// against the generated stylesheet instead: find the media block and
// check that one of the element's emotion classes declares the expected
// value inside it.

const getStyleText = () =>
  Array.from(document.querySelectorAll('style'))
    .map(style => style.textContent ?? '')
    .join('');

const expectMediaDeclaration = (
  element: Element,
  media: string,
  declaration: string,
) => {
  const cssText = getStyleText();
  const classCandidates = [...element.classList].filter(className =>
    className.startsWith('css-'),
  );
  expect(classCandidates.length).toBeGreaterThan(0);

  // Several emotion classes may carry the same media query, so scan
  // every occurrence of it and check each following rule block.
  let searchFrom = 0;
  let isMatched = false;

  for (;;) {
    const mediaIndex = cssText.indexOf(media, searchFrom);
    if (mediaIndex === -1) {
      break;
    }

    const segment = cssText.slice(mediaIndex);
    const nextMedia = segment.indexOf('@media', 1);
    const block = nextMedia === -1 ? segment : segment.slice(0, nextMedia);

    if (
      classCandidates.some(
        className =>
          block.includes(`.${className}`) && block.includes(declaration),
      )
    ) {
      isMatched = true;
      break;
    }

    searchFrom = mediaIndex + media.length;
  }

  expect(isMatched).toBe(true);
};

describe('Button size', () => {
  it('uses the stock Coss button when size is omitted', () => {
    render(<Button>Default</Button>);

    const button = screen.getByRole('button', { name: 'Default' });

    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.className).toContain('h-9');
  });

  it('maps small and extra-large onto Coss sizes', () => {
    render(<Button size="small">Small</Button>);
    render(<Button size="extra-large">Extra Large</Button>);

    expect(screen.getByRole('button', { name: 'Small' }).className).toContain(
      'h-8',
    );
    expect(
      screen.getByRole('button', { name: 'Extra Large' }).className,
    ).toContain('h-11');
  });

  it('maps primary, normal, and bare onto Coss variants', () => {
    render(<Button variant="primary">Primary</Button>);
    render(<Button variant="normal">Normal</Button>);
    render(<Button variant="bare">Bare</Button>);

    expect(screen.getByRole('button', { name: 'Primary' }).className).toContain(
      'bg-primary',
    );
    expect(screen.getByRole('button', { name: 'Normal' }).className).toContain(
      'border-input',
    );
    expect(screen.getByRole('button', { name: 'Bare' }).className).toContain(
      'border-transparent',
    );
  });
});

describe('Text size', () => {
  it('applies no font-size opinion when size is omitted', () => {
    render(<Text data-testid="plain">Plain</Text>);

    const plain = screen.getByTestId('plain');
    const reference = plain.ownerDocument.createElement('span');
    plain.ownerDocument.body.appendChild(reference);

    expect(getComputedStyle(plain).fontSize).toBe(
      getComputedStyle(reference).fontSize,
    );
  });

  it('applies size styles when provided', () => {
    render(<Text size="large">Large text</Text>);

    const text = screen.getByText('Large text');
    const computed = getComputedStyle(text);

    // Base (narrow) value; steps down to 15px from the small breakpoint.
    expect(computed.fontSize).toBe('16px');
    expect(computed.lineHeight).toBe('22px');
    expectMediaDeclaration(text, '@media (min-width: 512px)', 'font-size:15px');
  });
});

describe('Input size', () => {
  it('uses the stock Coss field when size is omitted', () => {
    render(<Input placeholder="Default" />);

    const input = screen.getByPlaceholderText('Default');

    expect(input.getAttribute('data-slot')).toBe('input');
    expect(input.parentElement?.getAttribute('data-size')).toBe('default');
  });

  it('maps large onto the Coss large field', () => {
    render(<Input size="large" placeholder="Large" />);

    expect(
      screen
        .getByPlaceholderText('Large')
        .parentElement?.getAttribute('data-size'),
    ).toBe('lg');
  });

  it('uses a large Coss field for BigInput', () => {
    render(<BigInput placeholder="Big" />);

    expect(
      screen
        .getByPlaceholderText('Big')
        .parentElement?.getAttribute('data-size'),
    ).toBe('lg');
  });
});
