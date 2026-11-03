import { useId, type ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
    </header>
  );
}

export function Card({
  title,
  caption,
  actions,
  children,
  className = "",
}: {
  title?: string;
  caption?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {caption && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{caption}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const inputCls =
  "h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      {label}
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  width = "w-32",
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
  list?: string;
}) {
  const id = useId();
  return (
    <input
      id={id}
      type="text"
      value={value}
      list={list}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} ${width} text-zinc-900 dark:text-zinc-100`}
    />
  );
}

/** Numeric input; empty string means "no bound" (null). */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  width = "w-20",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
}) {
  const id = useId();
  return (
    <input
      id={id}
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
      }}
      className={`${inputCls} ${width} tabular-nums text-zinc-900 dark:text-zinc-100`}
    />
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputCls} text-zinc-900 dark:text-zinc-100`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex h-8 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input type="checkbox" id={useId()} checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-zinc-900 dark:accent-zinc-100" />
      {label}
    </label>
  );
}

export function Button({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

export function Loading({ label = "Loading data…", height = 200 }: { label?: string; height?: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">Failed to load data: {message}</p>;
}
