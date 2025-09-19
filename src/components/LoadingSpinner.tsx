import React from 'react';
import { Spinner } from '@heroui/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  label = '加载中...', 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Spinner 
        size={size} 
        color="primary"
        aria-label={label}
      />
      <p className="mt-2 text-sm text-gray-600">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
