
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Textarea } from '../textarea';
import '@testing-library/jest-dom';

describe('Textarea', () => {
    it('renders correctly', () => {
        render(<Textarea placeholder="Type here" />);
        expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    });

    it('handles value change', () => {
        render(<Textarea />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Hello' } });
        expect(textarea).toHaveValue('Hello');
    });

    it('applies disabled state', () => {
        render(<Textarea disabled />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('applies custom classes', () => {
        render(<Textarea className="resize-none" />);
        expect(screen.getByRole('textbox')).toHaveClass('resize-none');
    });
});
