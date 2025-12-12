/**
 * Centralized Animation Utilities
 * Provides reusable framer-motion variants for consistent animations across the app.
 */
import { Variants } from 'framer-motion';

// Page transition variants - smooth fade with slight slide
export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
            ease: 'easeIn',
        },
    },
};

// Card container variants - for staggered children
export const cardContainerVariants: Variants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

// Individual card variants
export const cardVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1], // Custom ease curve
        },
    },
    hover: {
        y: -4,
        scale: 1.02,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
    tap: {
        scale: 0.98,
    },
};

// Modal backdrop variants
export const backdropVariants: Variants = {
    hidden: {
        opacity: 0,
    },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.2,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.15,
            delay: 0.1,
        },
    },
};

// Modal content variants
export const modalVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 300,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            duration: 0.15,
        },
    },
};

// List item variants for staggered lists
export const listItemVariants: Variants = {
    hidden: {
        opacity: 0,
        x: -10,
    },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// Fade in/out variant for simple transitions
export const fadeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.2 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15 },
    },
};

// Slide variants for panels
export const slideVariants: Variants = {
    hiddenLeft: { x: '-100%', opacity: 0 },
    hiddenRight: { x: '100%', opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            damping: 30,
            stiffness: 300,
        },
    },
    exitLeft: { x: '-100%', opacity: 0 },
    exitRight: { x: '100%', opacity: 0 },
};

// Button hover animation preset
export const buttonHoverVariants: Variants = {
    initial: { scale: 1 },
    hover: {
        scale: 1.05,
        transition: { duration: 0.15 },
    },
    tap: { scale: 0.95 },
};

// Spinner/loading animation
export const spinnerVariants: Variants = {
    animate: {
        rotate: 360,
        transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
        },
    },
};

// Pulse animation for notifications/badges
export const pulseVariants: Variants = {
    initial: { scale: 1 },
    pulse: {
        scale: [1, 1.1, 1],
        transition: {
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 2,
        },
    },
};
