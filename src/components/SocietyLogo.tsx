import React from 'react';
import hdLogo from '../assets/images/declamate_hd_logo_1787018484801.jpg';

interface SocietyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  useSvg?: boolean;
}

export const SocietyLogo: React.FC<SocietyLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-28 h-28 sm:w-32 sm:h-32',
    '2xl': 'w-36 h-36 sm:w-44 sm:h-44',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-white shadow-md border border-[#BFA373]/50 p-0.5 select-none hover:shadow-lg transition-all ${sizeClasses[size]} ${className}`}
      title="The Declamate's Society - Sri Amaravathi College of Arts and Science, Karur"
    >
      <img
        src={hdLogo}
        alt="The Declamate's Society Official Logo - Sri Amaravathi College of Arts and Science, Karur"
        className="w-full h-full object-contain rounded-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
