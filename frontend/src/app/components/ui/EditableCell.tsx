import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Check, X, Pencil } from 'lucide-react';

interface EditableCellProps {
    value: string | number;
    onSave: (newValue: string | number) => void;
    type?: 'text' | 'number';
    className?: string;
    formatDisplay?: (val: string | number) => string;
}

export function EditableCell({
    value,
    onSave,
    type = 'text',
    className = '',
    formatDisplay,
}: EditableCellProps) {
    const { isAdmin } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Update local state when prop changes
    useEffect(() => {
        setEditValue(String(value));
    }, [value]);

    const handleSave = () => {
        const newVal = type === 'number' ? parseFloat(editValue) || 0 : editValue;
        onSave(newVal);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(String(value));
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    const displayValue = formatDisplay ? formatDisplay(value) : String(value);

    if (!isAdmin) {
        return <span className={className}>{displayValue}</span>;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    ref={inputRef}
                    type={type}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full min-w-[60px] px-2 py-1 text-sm border border-teal-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-mono"
                    step={type === 'number' ? 'any' : undefined}
                />
                <button
                    onClick={handleSave}
                    className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                    title="Save"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleCancel}
                    className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                    title="Cancel"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <span
            className={`group/cell inline-flex items-center gap-1.5 cursor-pointer hover:text-teal-600 transition-colors ${className}`}
            onClick={() => setIsEditing(true)}
            title="Click to edit"
        >
            {displayValue}
            <Pencil className="w-3 h-3 opacity-0 group-hover/cell:opacity-50 transition-opacity text-teal-500" />
        </span>
    );
}
