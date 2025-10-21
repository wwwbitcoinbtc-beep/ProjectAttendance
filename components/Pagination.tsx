import React from 'react';
import { toPersianDigits } from '../utils/persian-utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const pageNumbers = [];
  const pageRange = 2; // How many pages to show around the current page

  // Logic to create page numbers with ellipses
  let startPage = Math.max(1, currentPage - pageRange);
  let endPage = Math.min(totalPages, currentPage + pageRange);

  if (currentPage - pageRange <= 2) {
      endPage = Math.min(totalPages, 1 + pageRange * 2);
  }
  if (currentPage + pageRange >= totalPages - 1) {
      startPage = Math.max(1, totalPages - pageRange * 2);
  }

  if (startPage > 1) {
    pageNumbers.push(1);
    if (startPage > 2) {
      pageNumbers.push('...');
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers.push('...');
    }
    pageNumbers.push(totalPages);
  }


  return (
    <nav className="flex justify-center items-center space-x-2 mt-6" dir="rtl">
      <button
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        قبلی
      </button>

      {pageNumbers.map((num, index) =>
        typeof num === 'string' ? (
          <span key={`ellipsis-${index}`} className="px-3 py-1 text-sm text-gray-500">
            ...
          </span>
        ) : (
          <button
            key={num}
            onClick={() => handlePageClick(num)}
            className={`px-3 py-1 text-sm font-medium border rounded-md ${
              currentPage === num
                ? 'bg-blue-500 text-white border-blue-500'
                : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {toPersianDigits(num)}
          </button>
        )
      )}

      <button
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        بعدی
      </button>
    </nav>
  );
};

export default Pagination;
