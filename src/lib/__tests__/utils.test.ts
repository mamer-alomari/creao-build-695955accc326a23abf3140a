
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
    describe('cn', () => {
        it('merges class names correctly', () => {
            expect(cn('c1', 'c2')).toBe('c1 c2');
        });

        it('handles conditional classes', () => {
            expect(cn('c1', true && 'c2', false && 'c3')).toBe('c1 c2');
        });

        it('overrides tailwind classes', () => {
            expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
        });

        it('handles arrays', () => {
            expect(cn(['c1', 'c2'])).toBe('c1 c2');
        });

        it('handles objects', () => {
            expect(cn({ c1: true, c2: false })).toBe('c1');
        });

        it('handles undefined and null', () => {
            expect(cn('c1', undefined, null)).toBe('c1');
        });
    });
});
