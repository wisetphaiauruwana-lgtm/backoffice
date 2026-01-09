import React, { useState, useEffect } from 'react';

type InputType = 'text' | 'number' | 'select';

interface InlineEditCellProps {
  // The raw value for the input field
  value: string | number;
  // The function to call when saving
  onSave: (newValue: string | number) => void;
  // The type of input to render
  type?: InputType;
  // Options for select input
  options?: string[];
  // Props for number input
  step?: string;
  min?: string;
  // The content to display when not in editing mode
  children: React.ReactNode;
}

const InlineEditCell: React.FC<InlineEditCellProps> = ({ value: initialValue, onSave, type = 'text', options = [], step, min, children }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);

  // When the initial value from props changes, update the internal state
  useEffect(() => {
    setCurrentValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    setIsEditing(false); // Exit editing mode immediately
    // Only trigger the onSave callback if the value has actually changed
    if (String(currentValue) !== String(initialValue)) {
      const valueToSave = type === 'number' ? Number(currentValue) : currentValue;
      onSave(valueToSave);
    }
  };

  const handleCancel = () => {
    // Reset to the original value and exit editing mode without saving
    setCurrentValue(initialValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderInput = () => {
    const commonProps = {
      value: currentValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCurrentValue(e.target.value),
      className: "block w-full px-2 py-1 bg-white border border-blue-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm",
      autoFocus: true,
      onKeyDown: handleKeyDown,
      onBlur: handleSave, // Save when the input loses focus
    };

    if (type === 'select') {
      return (
        <select {...commonProps}>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return <input type={type} step={step} min={min} {...commonProps} />;
  };

  if (isEditing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        {renderInput()}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="cursor-pointer hover:bg-blue-50/80 rounded-md -m-1.5 p-1.5 min-h-[34px] flex items-center justify-center"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setIsEditing(true); } }}
    >
      {children}
    </div>
  );
};

export default InlineEditCell;
