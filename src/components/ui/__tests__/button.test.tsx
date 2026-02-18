
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../button';
import '@testing-library/jest-dom';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('applies variant classes', () => {
        render(<Button variant="destructive">Delete</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain('bg-destructive');
    });

    it('applies size classes', () => {
        render(<Button size="sm">Small</Button>);
        const btn = screen.getByRole('button');
        expect(btn.className).toContain('h-8');
    });

    it('renders as child', () => {
        render(<Button asChild><a href="/link">Link</a></Button>);
        expect(screen.getByRole('link', { name: /link/i })).toBeInTheDocument();
    });

    it('handles disabled state', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
