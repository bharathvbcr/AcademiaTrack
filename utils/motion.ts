import { Variants } from 'framer-motion';

export const staggerContainer = (staggerChildren: number = 0.1, delayChildren: number = 0): Variants => ({
    hidden: {},
    show: {
        transition: {
            staggerChildren,
            delayChildren,
        },
    },
});

export const fadeIn = (direction: 'up' | 'down' | 'left' | 'right' | '', type: any, delay: number, duration: number): Variants => ({
    hidden: {
        x: direction === 'left' ? 100 : direction === 'right' ? -100 : 0,
        y: direction === 'up' ? 100 : direction === 'down' ? -100 : 0,
        opacity: 0,
    },
    show: {
        x: 0,
        y: 0,
        opacity: 1,
        transition: {
            type,
            delay,
            duration,
            ease: 'easeOut',
        },
    },
});

export const zoomIn = (delay: number, duration: number): Variants => ({
    hidden: {
        scale: 0,
        opacity: 0,
    },
    show: {
        scale: 1,
        opacity: 1,
        transition: {
            type: 'tween',
            delay,
            duration,
            ease: 'easeOut',
        },
    },
});

export const slideIn = (direction: 'up' | 'down' | 'left' | 'right', type: any, delay: number, duration: number): Variants => ({
    hidden: {
        x: direction === 'left' ? '-100%' : direction === 'right' ? '100%' : 0,
        y: direction === 'up' ? '100%' : direction === 'down' ? '100%' : 0,
    },
    show: {
        x: 0,
        y: 0,
        transition: {
            type,
            delay,
            duration,
            ease: 'easeOut',
        },
    },
});
