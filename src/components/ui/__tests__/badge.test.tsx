
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../badge';
import '@testing-library/jest-dom';

describe('Badge', () => {
    it('renders content', () => {
        render(<Badge>Status</Badge>);
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('applies default variant', () => {
        render(<Badge>Default</Badge>);
        const badge = screen.getByText('Default');
        expect(badge.className).toContain('bg-primary');
    });

    it('applies secondary variant', () => {
        render(<Badge variant="secondary">Secondary</Badge>);
        const badge = screen.getByText('Secondary');
        expect(badge.className).toContain('bg-secondary');
    });

    it('applies destructive variant', () => {
        render(<Badge variant="destructive">Destructive</Badge>);
        const badge = screen.getByText('Destructive');
        expect(badge.className).toContain('bg-destructive');
    });

    it('applies outline variant', () => {
        render(<Badge variant="outline">Outline</Badge>);
        const badge = screen.getByText('Outline');
        expect(badge.className).toContain('text-foreground');
    });
});
