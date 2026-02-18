
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';
import '@testing-library/jest-dom';

vi.mock("@radix-ui/react-avatar", () => ({
    Root: ({ className, ...props }: any) => <div className={className} {...props} />,
    Image: ({ className, ...props }: any) => <img className={className} {...props} />,
    Fallback: ({ className, ...props }: any) => <div className={className} {...props} />,
}));

describe('Avatar', () => {
    it('renders image when src provided', () => {
        render(
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
        );
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://github.com/shadcn.png');
    });

    it('renders fallback when image fails (simulated by not providing src)', () => {
        render(
            <Avatar>
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText('CN')).toBeInTheDocument();
    });

    it('applies custom class names', () => {
        const { container } = render(<Avatar className="h-12 w-12" />);
        expect(container.firstChild).toHaveClass('h-12');
        expect(container.firstChild).toHaveClass('w-12');
    });
});
