import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactElement;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', leftIcon, className, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSpacing = leftIcon && children ? 'mr-2' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {/* FIX: Cast leftIcon to React.ReactElement<any> to resolve type error with cloneElement. */}
      {leftIcon && React.cloneElement(leftIcon as React.ReactElement<any>, { className: `w-5 h-5 ${iconSpacing}` })}
      {children}
    </button>
  );
};

export default Button;