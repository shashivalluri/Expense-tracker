import React from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  hoverable = false, 
  glow = false,
  onClick,
  ...props 
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl 
        glass-card
        ${hoverable ? 'glass-card-hover cursor-pointer' : ''}
        ${glow ? 'shadow-glass-glow' : ''}
        ${onClick ? 'cursor-pointer hover:border-brand-indigo/35' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
