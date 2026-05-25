import React from 'react';

export const VmsLogo = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue background */}
    <rect width="200" height="240" fill="#005a8c"/>
    
    {/* Red V */}
    <path d="M0 0h200l-100 130L0 0z" fill="#e62020"/>
    
    {/* Outline for the V to make it look a bit like the image */}
    <path d="M15 0h170l-85 110L15 0z" fill="#e62020" stroke="white" strokeWidth="6"/>
    
    {/* Lightning Bolt */}
    <path d="M110 30l-30 30h20l-10 30 35-35H105l15-25z" fill="white"/>
    
    {/* Globe lines (simplified) */}
    <path d="M30 240 a150 150 0 0 1 140 -100" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M60 240 a120 120 0 0 1 110 -80" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M100 240 a90 90 0 0 1 70 -50" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M150 240 a50 50 0 0 1 50 -20" stroke="white" strokeWidth="2" fill="none"/>
    
    <path d="M100 140 a100 150 0 0 0 -50 100" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M130 140 a130 150 0 0 0 -30 100" stroke="white" strokeWidth="2" fill="none"/>
    
    {/* Text block */}
    <text x="100" y="270" fill="gray" fontSize="24" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">V.M.S. GROUP</text>
    <rect x="20" y="278" width="160" height="2" fill="gray"/>
    <text x="100" y="295" fill="gray" fontSize="18" fontFamily="sans-serif" textAnchor="middle" letterSpacing="2">SINCE 1989</text>
  </svg>
);
