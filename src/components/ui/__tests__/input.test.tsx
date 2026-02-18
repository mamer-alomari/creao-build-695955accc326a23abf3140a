
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../input';
import '@testing-library/jest-dom';

describe('Input', () => {
    it('renders correctly', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('handles value change', () => {
        const handleChange = vi.fn();
        render(<Input onChange={handleChange} />);
        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'test' } });
        expect(handleChange).toHaveBeenCalled();
    });

    it('accepts type attribute', () => {
        render(<Input type="password" placeholder="Password" />);
        // Password inputs don't have implicit role 'textbox', so query by placeholder/label or specific selector
        expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    });

    it('handles disabled state', () => {
        render(<Input disabled />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });
});
