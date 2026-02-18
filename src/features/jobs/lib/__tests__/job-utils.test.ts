
import { describe, it, expect } from 'vitest';
import { JobStatus } from "@/sdk/database/orm/orm_job";

describe('JobStatus', () => {
    it('has correct enum values', () => {
        expect(JobStatus.Unspecified).toBe(0);
        expect(JobStatus.Quote).toBe(1);
        expect(JobStatus.Booked).toBe(2);
        expect(JobStatus.InProgress).toBe(3);
        expect(JobStatus.Completed).toBe(4);
        expect(JobStatus.Canceled).toBe(5);
    });

    it('supports reverse mapping', () => {
        expect(JobStatus[0]).toBe('Unspecified');
        expect(JobStatus[2]).toBe('Booked');
    });
});
