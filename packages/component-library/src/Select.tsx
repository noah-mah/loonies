import type { CSSProperties, ReactNode } from 'react';

import { css, cx } from '@emotion/css';

import {
  Select as CossSelect,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './coss/components/select';
import { Menu } from './Menu';

/** A non-selectable heading above the options that follow it */
export type SelectHeading = readonly [typeof Menu.label, string];

export type SelectOption<Value = string> =
  | [Value, string]
  | SelectHeading
  | typeof Menu.line;

function isHeading<Value>(
  option: readonly [Value, string] | SelectHeading,
): option is SelectHeading {
  return option[0] === Menu.label;
}

function isValueOption<Value>(
  option: readonly [Value, string] | SelectHeading | typeof Menu.line,
): option is [Value, string] {
  return option !== Menu.line && !isHeading(option);
}

type SelectProps<Value> = {
  id?: string;
  bare?: boolean;
  options: Array<readonly [Value, string] | SelectHeading | typeof Menu.line>;
  value: Value;
  defaultLabel?: string;
  onChange?: (newValue: Value) => void;
  disabled?: boolean;
  disabledKeys?: Value[];
  style?: CSSProperties;
  popoverStyle?: CSSProperties;
  className?: string;
};

function optionKey<Value>(value: Value): string {
  return String(value);
}

/**
 * @param {Array<[string, string]>} options - An array of options value-label pairs.
 *   `Menu.line` renders a divider and `[Menu.label, 'Heading']` a heading
 *   over the options that follow it.
 * @param {string} value - The currently selected option value.
 * @param {string} [defaultLabel] - The label to display when the selected value is not in the options.
 * @param {function} [onChange] - A callback function invoked when the selected value changes.
 * @param {CSSProperties} [style] - Custom styles to apply to the selected button.
 * @param {string[]} [disabledKeys] - An array of option values to disable.
 *
 * @example
 * // Usage:
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="1" onChange={handleOnChange} />
 * // <Select options={[['1', 'Option 1'], ['2', 'Option 2']]} value="3" defaultLabel="Select an option"  onChange={handleOnChange} />
 */
export function Select<const Value = string>({
  id,
  bare,
  options,
  value,
  defaultLabel = '',
  onChange,
  disabled = false,
  disabledKeys = [],
  style,
  popoverStyle,
  className,
}: SelectProps<Value>) {
  const valueOptions = options.filter(isValueOption);
  const selected = valueOptions.find(option => option[0] === value);
  const disabledKeySet = new Set(disabledKeys.map(optionKey));

  const nodes: ReactNode[] = [];
  let groupItems: ReactNode[] = [];
  let groupLabel: string | null = null;
  let groupIndex = 0;

  const flushGroup = () => {
    if (groupLabel === null) return;
    nodes.push(
      <SelectGroup key={`group-${groupIndex}`}>
        <SelectGroupLabel>{groupLabel}</SelectGroupLabel>
        {groupItems}
      </SelectGroup>,
    );
    groupIndex += 1;
    groupLabel = null;
    groupItems = [];
  };

  options.forEach((option, index) => {
    if (option === Menu.line) {
      flushGroup();
      nodes.push(<SelectSeparator key={`line-${index}`} />);
      return;
    }

    if (isHeading(option)) {
      flushGroup();
      groupLabel = option[1];
      return;
    }

    const item = (
      <SelectItem
        key={optionKey(option[0])}
        value={optionKey(option[0])}
        disabled={disabledKeySet.has(optionKey(option[0]))}
        className={
          selected && selected[0] === option[0] ? 'font-semibold' : undefined
        }
      >
        {option[1]}
      </SelectItem>
    );

    if (groupLabel === null) {
      nodes.push(item);
      return;
    }

    groupItems.push(item);
  });
  flushGroup();

  return (
    <CossSelect
      value={selected ? optionKey(selected[0]) : null}
      disabled={disabled}
      onValueChange={next => {
        if (next == null) return;
        const match = valueOptions.find(
          option => optionKey(option[0]) === next,
        );
        if (match) onChange?.(match[0]);
      }}
    >
      <SelectTrigger
        id={id}
        className={cx(
          bare && 'border-transparent bg-transparent shadow-none',
          style && css({ ...style }),
          className,
        )}
      >
        <SelectValue placeholder={defaultLabel} />
      </SelectTrigger>
      <SelectPopup
        className={popoverStyle ? css({ ...popoverStyle }) : undefined}
      >
        {nodes}
      </SelectPopup>
    </CossSelect>
  );
}
