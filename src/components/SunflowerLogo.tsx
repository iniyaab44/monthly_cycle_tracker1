import React from 'react';

export default function SunflowerLogo({ size = 48, className = "" }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      style={{ filter: 'drop-shadow(2px 2px 0px black)' }}
    >
      {/* Petals - Outer Layer */}
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(0 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(30 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(60 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(90 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(120 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(150 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(180 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(210 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(240 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(270 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(300 50 50)" />
      <path d="M50 10 Q60 25 50 40 Q40 25 50 10" fill="#FFD27D" stroke="black" strokeWidth="3" transform="rotate(330 50 50)" />
      
      {/* Center */}
      <circle cx="50" cy="50" r="18" fill="#8B4513" stroke="black" strokeWidth="3" />
      
      {/* Seeds/Dots */}
      <circle cx="45" cy="45" r="1.5" fill="black" />
      <circle cx="55" cy="45" r="1.5" fill="black" />
      <circle cx="50" cy="50" r="1.5" fill="black" />
      <circle cx="45" cy="55" r="1.5" fill="black" />
      <circle cx="55" cy="55" r="1.5" fill="black" />
      <circle cx="50" cy="42" r="1.5" fill="black" />
      <circle cx="50" cy="58" r="1.5" fill="black" />
      <circle cx="42" cy="50" r="1.5" fill="black" />
      <circle cx="58" cy="50" r="1.5" fill="black" />
    </svg>
  );
}
