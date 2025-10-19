import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="lds-ring" aria-label="در حال بارگذاری">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

export const ButtonSpinner: React.FC = () => {
  return (
    <div className="btn-spinner" aria-label="در حال پردازش">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};


export default Spinner;