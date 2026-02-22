import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface PriceFlashProps {
    value: number;
    formatter?: (val: number) => string;
    className?: string;
}

export default function PriceFlash({ value, formatter, className }: PriceFlashProps) {
    const prevValueRef = useRef<number>(value);
    const [flashType, setFlashType] = useState<'up' | 'down' | null>(null);

    useEffect(() => {
        // Only flash if the value has actually changed and we have a previous value
        if (prevValueRef.current !== undefined && value !== prevValueRef.current) {
            if (value > prevValueRef.current) {
                setFlashType('up');
            } else {
                setFlashType('down');
            }

            const timer = setTimeout(() => {
                setFlashType(null);
            }, 700); // 700ms flash duration

            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    return (
        <span
            className={clsx(
                "transition-colors duration-700 rounded px-1 -mx-1 inline-block",
                flashType === 'up' && "bg-emerald-500/30 text-emerald-400 font-bold",
                flashType === 'down' && "bg-rose-500/30 text-rose-400 font-bold",
                !flashType && className
            )}
        >
            {formatter ? formatter(value) : value}
        </span>
    );
}
