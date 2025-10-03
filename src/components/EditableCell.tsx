import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  isEditing: boolean;
  isSelected: boolean;
  isFormula: boolean;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onStopEdit: (save: boolean) => void;
  style: React.CSSProperties;
}

export function EditableCell({
  value,
  isEditing,
  isSelected,
  isFormula,
  onStartEdit,
  onChange,
  onStopEdit,
  style,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!isEditing) {
      onStartEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onStopEdit(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onStopEdit(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onStopEdit(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    if (isEditing) {
      onStopEdit(true);
    }
  };

  if (isEditing) {
    return (
      <div
        style={style}
        className="border-2 border-primary bg-background absolute z-10"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-full px-2 py-1 text-sm outline-none bg-transparent"
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "border-r border-b px-2 py-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap transition-colors cursor-cell",
        isSelected
          ? "bg-primary/10 border-2 border-primary"
          : "bg-background hover:bg-accent/30",
        isFormula && "text-primary font-mono text-xs"
      )}
      onDoubleClick={handleDoubleClick}
      title={value}
    >
      {value}
    </div>
  );
}
