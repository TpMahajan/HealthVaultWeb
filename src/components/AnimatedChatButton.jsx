import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

const AnimatedChatButton = ({ onClick, className = "" }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetch('/purpleBot.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load animation');
        return response.json();
      })
      .then((data) => {
        if (mounted) setAnimationData(data);
      })
      .catch(() => {
        if (mounted) setAnimationData(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleClick = () => {
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-40 p-0 bg-transparent border-none cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-0 focus:border-none ${className}`}
      aria-label="AI Assistant"
      style={{
        width: '120px',
        height: '120px',
        transition: 'all 0.3s ease',
        outline: 'none !important',
        boxShadow: 'none !important',
        border: 'none !important',
        background: 'transparent !important',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {animationData && (
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{ width: '120%', height: '100%', outline: 'none', border: 'none' }}
        />
      )}
    </button>
  );
};

export default AnimatedChatButton;
