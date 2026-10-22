import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

// Vitest for this package runs with cwd = packages/component-library
const iconsRoot = path.join(process.cwd(), 'src/icons');

describe('Lucide icon policy', () => {
  for (const version of ['v0', 'v1', 'v2'] as const) {
    const dir = path.join(iconsRoot, version);

    it(`${version} has no raw .svg assets (Lucide-only)`, () => {
      const svgs = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
      expect(svgs).toEqual([]);
    });

    it(`${version} icon modules are Lucide wrappers`, () => {
      const files = fs
        .readdirSync(dir)
        .filter(f => f.endsWith('.tsx'))
        .map(f => path.join(dir, f));

      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        expect(source, file).toContain("from 'lucide-react'");
        expect(source, file).toContain('createLucideIcon');
      }
    });
  }

  it('keeps the brand logo as the only custom SVG mark', () => {
    const logoSvg = path.join(iconsRoot, 'logo', 'logo.svg');
    expect(fs.existsSync(logoSvg)).toBe(true);
  });
});
