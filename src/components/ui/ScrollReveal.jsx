import React, { useEffect, useRef, useState } from 'react';

export const ScrollReveal = ({
    children,
    className = "",
    direction = "up", // "up", "down", "left", "right", "none"
    delay = 0,
    threshold = 0.1,
    id,
    ...props
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            // Allow multiple observer triggers if we wanted to replay, 
            // but typically we just reveal once for performance.
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                // Optional: comment out unobserve if you want it to hide/show repeatedly
                observer.unobserve(domRef.current);
            }
        }, { threshold });

        const currentRef = domRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [threshold]);

    // Determine initial hidden state
    let hiddenClass = "opacity-0";
    if (direction === "up") hiddenClass += " translate-y-8";
    else if (direction === "down") hiddenClass += " -translate-y-8";
    else if (direction === "left") hiddenClass += " translate-x-8";
    else if (direction === "right") hiddenClass += " -translate-x-8";
    else if (direction === "none") hiddenClass += " scale-95";

    // Visible state
    const visibleClass = "opacity-100 translate-y-0 translate-x-0 scale-100";

    return (
        <div
            id={id}
            ref={domRef}
            className={`transition-all duration-[800ms] ease-out will-change-[opacity,transform] ${isVisible ? visibleClass : hiddenClass} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
            {...props}
        >
            {children}
        </div>
    );
};
