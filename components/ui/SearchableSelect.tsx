
import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface OptionGroup {
  label: string;
  options: string[];
}

interface SearchableSelectProps {
  options: OptionGroup[];
  value: string;
  onChange: (newValue: string) => void;
  onBlur: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, onBlur }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur(); // Trigger save on blur
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, onBlur]);
  
  const handleSelect = (option: string) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
    onBlur(); // Trigger save on select
  };

  const filteredOptions = options.map(group => ({
    ...group,
    options: group.options.filter(option => 
      option.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.options.length > 0);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search point of entry..."
          className="w-full pl-9 pr-4 py-1.5 bg-white border border-blue-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          autoFocus
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(group => (
              <div key={group.label}>
                <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">{group.label}</h3>
                <ul>
                  {group.options.map(option => (
                    <li
                      key={option}
                      onClick={() => handleSelect(option)}
                      className="px-3 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50"
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
