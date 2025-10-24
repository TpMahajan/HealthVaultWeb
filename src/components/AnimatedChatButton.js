import React, { useState, useRef } from 'react';
import Lottie from 'lottie-react';

const AnimatedChatButton = ({ onClick, className = "" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const lottieRef = useRef();

  // Load animation data from public folder
  React.useEffect(() => {
    fetch('/purpleBot.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));
  }, []);

  const handleClick = () => {
    onClick();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (lottieRef.current) {
      lottieRef.current.stop();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
      {animationData && (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
            filter: isHovered ? 'brightness(1.1) saturate(1.2)' : 'none',
            transition: 'filter 0.3s ease',
            outline: 'none',
            border: 'none'
          }}
        />
      )}
    </button>
  );
};

export default AnimatedChatButton;
