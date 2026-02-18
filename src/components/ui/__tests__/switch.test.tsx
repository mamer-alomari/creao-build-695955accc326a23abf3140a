
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Switch } from '../switch';
import '@testing-library/jest-dom';

describe('Switch', () => {
    it('renders correctly', () => {
        render(<Switch role="switch" />);
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('handles checked state', () => {
        render(<Switch checked={true} role="switch" />);
        expect(screen.getByRole('switch')).toBeChecked();
    });

    it('handles disabled state', () => {
        render(<Switch disabled role="switch" />);
        expect(screen.getByRole('switch')).toBeDisabled();
    });
});
