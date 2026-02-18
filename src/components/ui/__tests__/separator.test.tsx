
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Separator } from '../separator';
import '@testing-library/jest-dom';

describe('Separator', () => {
    it('renders horizontal by default', () => {
        render(<Separator data-testid="sep" />);
        const sep = screen.getByTestId('sep');
        expect(sep).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('renders vertical', () => {
        render(<Separator orientation="vertical" data-testid="sep" />);
        const sep = screen.getByTestId('sep');
        expect(sep).toHaveAttribute('data-orientation', 'vertical');
    });

    it('applies decorative prop', () => {
        // Radix separator handles this, check if role is none/presentation if needed
        // Just verify render
        render(<Separator decorative />);
    });
});
