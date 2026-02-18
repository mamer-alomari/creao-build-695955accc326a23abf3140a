
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from '../label';
import '@testing-library/jest-dom';

describe('Label', () => {
    it('renders children', () => {
        render(<Label htmlFor="test">Label Text</Label>);
        expect(screen.getByText('Label Text')).toBeInTheDocument();
    });

    it('passes props', () => {
        render(<Label htmlFor="email">Email</Label>);
        expect(screen.getByText('Email')).toHaveAttribute('for', 'email');
    });
});
