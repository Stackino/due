import 'jest';
import { pathCombine } from '../../src/tools/path-combine';

test('combine path 1', () => {
    const result = pathCombine('/', 'some-path', 'new-fragment');

    expect(result).toBe('/some-path/new-fragment');
});

test('combine path 2', () => {
    const result = pathCombine('/', 'some-path', '/new-fragment');

    expect(result).toBe('/some-path/new-fragment');
});

test('combine path 3', () => {
    const result = pathCombine('/', 'some-path/', '/new-fragment');

    expect(result).toBe('/some-path/new-fragment');
});