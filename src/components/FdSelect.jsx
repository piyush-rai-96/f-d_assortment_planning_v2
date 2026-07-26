import { useEffect, useState } from "react";
import { Select } from "impact-ui";
import "./FdSelect.css";

/*
 * FdSelect — thin controlled wrapper around Impact UI's <Select>.
 * Impact UI's Select is a fully controlled react-select variant that expects
 * several pieces of state (open, current options, selected options). This
 * wrapper hides that boilerplate behind a simple value/onChange contract so
 * views can drop in single-select or multi-select dropdowns consistently.
 *
 *   options:   [{ value, label }]
 *   value:     the currently selected `value` (string) — or string[] when isMulti
 *   onChange:  (value) => void  — or (value[]) => void when isMulti
 *   isMulti:   boolean (default false)
 */
export default function FdSelect({
  label,
  value,
  options,
  onChange,
  width = 220,
  minWidth,
  isWithSearch = false,
  isMulti = false,
  isWithSelectAll = false,
  isClearable = false,
  isWithSelectedOptionTags = false,
  disabled = false,
  placeholder = "Select…",
}) {
  // Impact UI's <Select> renders at whatever `minWidth` it's given — it does not
  // reliably expand to fill width="100%". So whenever we pass a numeric `width`
  // (i.e. a fixed-size dropdown), minWidth must default to that SAME value,
  // otherwise the Select collapses down to an arbitrary floor and truncates its
  // label (this previously broke every fixed-width FdSelect across the app).
  // Percentage / string widths (e.g. "100%" in the scope drawer) should fill
  // their container instead, so we leave min-width unset there.
  const isNumericWidth = typeof width === "number";
  const resolvedMinWidth = minWidth ?? (isNumericWidth ? width : undefined);
  const findOption = (v) =>
    options.find((o) => String(o.value) === String(v)) || null;

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(options);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Multi-select: selectedOptions is an array; single: an object or null
  const [selectedOptions, setSelectedOptionsRaw] = useState(() => {
    if (isMulti) {
      const vals = Array.isArray(value) ? value : value ? [value] : [];
      return vals.map(findOption).filter(Boolean);
    }
    return findOption(value);
  });

  useEffect(() => {
    setCurrentOptions(options);
  }, [options]);

  useEffect(() => {
    if (isMulti) {
      const vals = Array.isArray(value) ? value : value ? [value] : [];
      setSelectedOptionsRaw(vals.map(findOption).filter(Boolean));
    } else {
      setSelectedOptionsRaw(findOption(value));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  const handleChange = (sel) => {
    if (isMulti) {
      const arr = Array.isArray(sel) ? sel : sel ? [sel] : [];
      setSelectedOptionsRaw(arr);
      setIsSelectAll(arr.length === options.length);
      onChange(arr.map((o) => o.value));
    } else {
      const obj = Array.isArray(sel) ? sel[sel.length - 1] || null : sel;
      setSelectedOptionsRaw(obj);
      if (obj && obj.value !== undefined) onChange(obj.value);
    }
  };

  const setSelectedOptions = (next) => {
    if (isMulti) {
      const arr = Array.isArray(next) ? next : next ? [next] : [];
      setSelectedOptionsRaw(arr);
    } else {
      const obj = Array.isArray(next) ? next[next.length - 1] || null : next;
      setSelectedOptionsRaw(obj);
    }
  };

  return (
    <div
      className={`fd-select-wrap${disabled ? " fd-select-disabled" : ""}`}
      aria-disabled={disabled || undefined}
      style={
        isNumericWidth
          ? { width: `${width}px`, maxWidth: `${width}px`, minWidth: resolvedMinWidth }
          : { width: "100%", maxWidth: width, minWidth: 120 }
      }
    >
      <Select
        label={label}
        isDisabled={disabled}
        labelOrientation="top"
        placeholder={placeholder}
        isMulti={isMulti}
        isWithSearch={isWithSearch}
        searchPlaceholder="Search…"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        withPortal
        width="100%"
        minWidth={resolvedMinWidth !== undefined ? `${resolvedMinWidth}px` : undefined}
        initialOptions={options}
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        handleChange={handleChange}
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        isWithSelectAll={isWithSelectAll}
        isClearable={isClearable}
        isWithSelectedOptionTags={isWithSelectedOptionTags}
        customPlaceholderAfterSelect={null}
      />
    </div>
  );
}
