import React from 'react';

const AnimatedChatButton = ({ onClick, className = "" }) => {
  const handleClick = () => {
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-40 p-0 bg-transparent border-none cursor-pointer transform transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-0 focus:border-none ${className}`}
      title="AI Assistant - Click to chat"
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
      <lottie-player
        src="/purpleBot.json"
        background="transparent"
        speed="1"
        style={{ width: '120%', height: '100%', outline: 'none', border: 'none' }}
        loop
        autoplay
      ></lottie-player>
    </button>
  );
};

export default AnimatedChatButton;
