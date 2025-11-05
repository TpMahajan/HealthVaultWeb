import React from 'react';

const Footer = ({ noBorder = false, whiteText = false }) => (
  <footer className={`w-full py-6 flex items-center justify-center mt-12 ${noBorder ? '' : 'border-t border-gray-200 dark:border-gray-800'}`}>
    <span className={`text-sm mr-2 ${whiteText ? 'text-white' : 'text-White-500 dark:text-White-400'}`}>Powered by</span>
    <a
      href="https://aially.in/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="AI Ally website"
      className="inline-flex items-center"
    >
      <img src="/AiAllyLogo.png" alt="AI Ally" className="h-6" />
    </a>
  </footer>
);

export default Footer;
