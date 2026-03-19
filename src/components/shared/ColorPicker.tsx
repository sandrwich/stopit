interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-neutral-300 cursor-pointer"
      />
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
    </label>
  );
}
