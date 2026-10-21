import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.test.ts'],
        typecheck: {enabled: true, include: ['test/unit/**/*.test-d.ts']},
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            thresholds: {100: true},
        },
    },
});
