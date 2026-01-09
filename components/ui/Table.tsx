import React from 'react';

// Export Column so other files (RoomManagement) สามารถ import และระบุชนิดได้
export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((item: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  renderRowActions?: (item: T) => React.ReactNode;
  getRowClassName?: (item: T) => string;
  onRowClick?: (item: T) => void;
  isScrollable?: boolean;
}

/**
 * Generic Table component
 * - T ต้องมี id (string | number) ตามที่ใช้เป็น key ใน <tr>
 */
function Table<T extends { id: string | number }>({
  columns,
  data,
  renderRowActions,
  getRowClassName,
  onRowClick,
  isScrollable = false,
}: TableProps<T>) {

  const renderCell = (col: Column<T>, item: T) => {
    if (typeof col.accessor === 'function') {
      return col.accessor(item);
    }
    // safe access when accessor is keyof T
    const value = (item as any)[col.accessor];
    // If value is ReactNode, return it. Otherwise stringify gracefully.
    if (React.isValidElement(value) || typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    // fallback for objects / undefined
    return value == null ? '—' : String(value);
  };

  const tableContent = (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          {columns.map((col, index) => (
            // note: Tailwind purge may remove dynamic classes (`text-${col.align}`).
            // If you use PurgeCSS, prefer mapping align -> classname manually (see note below).
            <th
              key={index}
              className={`px-6 py-4 ${
                col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
              } text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white`}
            >
              {col.header}
            </th>
          ))}
          {renderRowActions && (
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">
              Actions
            </th>
          )}
        </tr>
      </thead>

      <tbody className="bg-white">
        {data.map((item) => (
          <tr
            key={item.id}
            className={`border-b border-gray-100 ${getRowClassName ? getRowClassName(item) : ''} ${
              onRowClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onRowClick && onRowClick(item)}
          >
            {columns.map((col, index) => (
              <td
                key={index}
                className={`px-6 py-4 align-middle whitespace-nowrap ${
                  col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'
                } text-gray-700`}
              >
                {renderCell(col, item)}
              </td>
            ))}

            {renderRowActions && (
              <td className="px-6 py-4 text-center align-middle">{renderRowActions(item)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (isScrollable) {
    return <div className="overflow-auto scrollbar-none">{tableContent}</div>;
  }

  return <div className="overflow-x-auto">{tableContent}</div>;
}

export default Table;
