import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuOption {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    options: (ContextMenuOption | 'separator')[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => {
            onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    // Adjust position to keep within viewport
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100 origin-top-left"
            style={style}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.preventDefault();
                // prevent nested context menu logic if any
            }}
        >
            {options.map((option, index) => {
                if (option === 'separator') {
                    return <div key={index} className="h-px bg-slate-100 my-1" />;
                }

                return (
                    <button
                        key={index}
                        onClick={() => {
                            if (!option.disabled) {
                                option.onClick();
                                onClose();
                            }
                        }}
                        disabled={option.disabled}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors
                            ${option.disabled ? 'opacity-50 cursor-not-allowed text-slate-400' :
                                option.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'}
                        `}
                    >
                        {option.icon && <span className="w-4 h-4 flex items-center justify-center">{option.icon}</span>}
                        {option.label}
                    </button>
                );
            })}
        </div>,
        document.body
    );
};
