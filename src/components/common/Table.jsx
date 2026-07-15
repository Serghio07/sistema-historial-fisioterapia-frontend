import { useEffect, useState } from 'react';
import Pagination from './Pagination';

function Table({ columns, rows, empty = 'No hay datos para mostrar.', paginate = true }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = paginate ? rows.slice((page - 1) * pageSize, page * pageSize) : rows;

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2.5 text-left text-xs font-bold uppercase text-slate-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                {empty}
              </td>
            </tr>
          ) : (
            visibleRows.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2.5 text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table></div>
      {paginate && <Pagination total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </div>
  );
}

export default Table;
