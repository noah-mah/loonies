//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** Packages that must not be used for UI icons (use Lucide instead). */
const BANNED_ICON_SOURCES = [
  'react-icons',
  '@heroicons/react',
  '@radix-ui/react-icons',
  'phosphor-react',
  '@phosphor-icons/react',
  '@tabler/icons-react',
  'feather-icons',
  'react-feather',
  '@mui/icons-material',
  'ionicons',
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons',
  '@fortawesome/free-regular-svg-icons',
  '@fortawesome/react-fontawesome',
];

/**
 * @param {string} source
 */
function isBannedIconSource(source) {
  return BANNED_ICON_SOURCES.some(
    banned => source === banned || source.startsWith(`${banned}/`),
  );
}

/**
 * Icon wrapper modules under the shared icon sets (not logo / loading).
 * @param {string} filename
 */
function isSharedIconWrapperFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return /packages\/component-library\/src\/icons\/v[012]\/[^/]+\.tsx$/.test(
    normalized,
  );
}

/**
 * App / UI packages where icon-library imports should be Lucide-backed.
 * @param {string} filename
 */
function isUiPackageFile(filename) {
  const normalized = filename.replace(/\\/g, '/');
  return (
    normalized.includes('packages/desktop-client/') ||
    normalized.includes('packages/component-library/') ||
    normalized.includes('packages/desktop-electron/')
  );
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require UI icons to come from Lucide (lucide-react / Svg* wrappers)',
    },
    fixable: null,
    schema: [],
    messages: {
      bannedIconPackage:
        'Do not import icons from "{{source}}". Use Lucide (lucide-react) or @actual-app/components/icons/* instead. See https://lucide.dev',
      iconWrapperMustUseLucide:
        'Shared icon wrappers must be Lucide-backed: import an icon from "lucide-react" and export it via createLucideIcon(...).',
      noRawSvgIconFiles:
        'Do not add raw .svg icon assets under icons/v0|v1|v2. Add a Lucide mapping in scripts/generate-lucide-icons.mjs instead (logo/ is the only custom mark).',
    },
  },

  createOnce(context) {
    let normalizedFilename;
    let isIconWrapper;
    let isUiPackage;
    let hasLucideImport = false;
    let hasCreateLucideIconImport = false;
    let usesCreateLucideIcon = false;

    return {
      before() {
        normalizedFilename = context.filename.replace(/\\/g, '/');
        isIconWrapper = isSharedIconWrapperFile(normalizedFilename);
        isUiPackage = isUiPackageFile(normalizedFilename);

        if (!isIconWrapper && !isUiPackage) {
          return false;
        }

        hasLucideImport = false;
        hasCreateLucideIconImport = false;
        usesCreateLucideIcon = false;
      },

      ImportDeclaration(node) {
        const source =
          typeof node.source.value === 'string' ? node.source.value : '';

        if (isUiPackage && isBannedIconSource(source)) {
          context.report({
            node: node.source,
            messageId: 'bannedIconPackage',
            data: { source },
          });
        }

        if (!isIconWrapper) {
          return;
        }

        if (source === 'lucide-react') {
          hasLucideImport = true;
        }

        for (const spec of node.specifiers) {
          if (
            spec.type === 'ImportSpecifier' &&
            spec.imported.name === 'createLucideIcon'
          ) {
            hasCreateLucideIconImport = true;
          }
        }
      },

      CallExpression(node) {
        if (
          isIconWrapper &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'createLucideIcon'
        ) {
          usesCreateLucideIcon = true;
        }
      },

      'Program:exit'(node) {
        if (!isIconWrapper) {
          return;
        }

        if (
          !hasLucideImport ||
          !hasCreateLucideIconImport ||
          !usesCreateLucideIcon
        ) {
          context.report({
            node,
            messageId: 'iconWrapperMustUseLucide',
          });
        }
      },
    };
  },
};
