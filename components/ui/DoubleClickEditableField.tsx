import React, { useState, useEffect, useRef } from 'react';
import SearchableSelect from './SearchableSelect';

interface OptionGroup {
  label: string;
  options: string[];
}

type InputType = 'text' | 'number' | 'date' | 'email' | 'select' | 'searchable-select' | 'textarea';

interface DoubleClickEditableFieldProps {
  initialValue: string | number;
  onSave: (newValue: string | number) => void;
  type?: InputType;
  options?: string[];
  groupedOptions?: OptionGroup[];
  label: string;
  startInEditMode?: boolean;
}

const DoubleClickEditableField: React.FC<DoubleClickEditableFieldProps> = ({
  initialValue,
  onSave,
  type = 'text',
  options = [],
  groupedOptions = [],
  label,
  startInEditMode = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (startInEditMode) {
      setIsEditing(true);
    }
  }, [startInEditMode]);

  useEffect(() => {
    if (isEditing && inputRef.current && type !== 'searchable-select') {
      inputRef.current.focus();
    }
  }, [isEditing, type]);

  const handleSave = () => {
    setIsEditing(false);
    if (String(value) !== String(initialValue)) {
      onSave(value);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (type !== 'textarea' || !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const commonProps: any = {
      ref: inputRef,
      value: value,
      className: "block w-full px-3 py-1.5 bg-white border border-blue-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
      'aria-label': label,
      onKeyDown: handleKeyDown,
    };
    
    if (type !== 'searchable-select') {
        commonProps.onBlur = handleSave;
    }
    
    if (type === 'searchable-select') {
        return (
             <SearchableSelect
                options={groupedOptions}
                value={String(value)}
                onChange={(newValue) => setValue(newValue)}
                onBlur={handleSave}
            />
        );
    }

    if (type === 'textarea') {
      return <textarea {...commonProps} onChange={(e) => setValue(e.target.value)} rows={3} />;
    }
    
    if (type === 'select') {
      return (
        <select {...commonProps} onChange={(e) => setValue(e.target.value)}>
          { options.length > 0 && !options.includes(String(value)) && <option value={String(value)} disabled>{String(value) || 'Select...'}</option> }
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return <input type={type} {...commonProps} onChange={(e) => setValue(e.target.value)} />;
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="cursor-pointer p-1.5 -m-1.5 transition-colors min-h-[40px] flex items-center border-b border-gray-200 hover:bg-gray-100"
      title={`Double-click to edit ${label}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(true); }}
      role="button"
      aria-label={`Edit ${label}`}
    >
      <span className="whitespace-pre-wrap text-black">{String(value) || '—'}</span>
    </div>
  );
};

export default DoubleClickEditableField;