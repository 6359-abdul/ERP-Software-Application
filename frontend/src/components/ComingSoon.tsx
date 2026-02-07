import React from 'react';

const ComingSoon: React.FC<{ pageTitle: string }> = ({ pageTitle }) => (
  <div className="flex items-center justify-center h-full p-4 bg-gray-100">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-700 tracking-tight">{pageTitle}</h1>
      <p className="mt-4 text-lg text-gray-500">This page is under construction.</p>
      <p className="mt-2 text-sm text-gray-400">Please check back later!</p>
    </div>
  </div>
);

export default ComingSoon; 
