
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from '../skeleton';
import '@testing-library/jest-dom';

describe('Skeleton', () => {
    it('renders with animation class', () => {
        render(<Skeleton data-testid="skeleton" />);
        expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
    });

    it('applies custom dimensions', () => {
        render(<Skeleton className="h-4 w-[200px]" data-testid="skeleton" />);
        const el = screen.getByTestId('skeleton');
        expect(el).toHaveClass('h-4');
        expect(el).toHaveClass('w-[200px]');
    });
});
