
import { describe, it, expect } from 'vitest';
import { deepMerge, getByPath, setByPath, deepFreeze } from '../src/utils/config/path_utils';

describe('deepMerge', () => {
    it('merges nested objects key by key', () => {
        const target = { a: 1, nested: { x: 1, y: 2 } };
        const result = deepMerge(target, { nested: { y: 99 } });
        expect(result).toEqual({ a: 1, nested: { x: 1, y: 99 } });
    });

    it('does not mutate the original target', () => {
        const target = { nested: { x: 1 } };
        deepMerge(target, { nested: { x: 2 } });
        expect(target.nested.x).toBe(1);
    });

    it('replaces arrays entirely rather than merging elements', () => {
        const target = { list: [1, 2, 3] };
        const result = deepMerge(target, { list: [9] });
        expect(result.list).toEqual([9]);
    });

    it('ignores explicit undefined values in source (keeps target value)', () => {
        const target = { a: 'keep-me' };
        const result = deepMerge(target, { a: undefined });
        expect(result.a).toBe('keep-me');
    });

    it('fills in a missing nested object from source entirely', () => {
        const target: { a: number; nested?: { x: number } } = { a: 1 };
        const result = deepMerge(target, { nested: { x: 5 } });
        expect(result.nested).toEqual({ x: 5 });
    });
});

describe('getByPath', () => {
    const obj = { a: { b: { c: 42 } } };

    it('reads a nested value by dot path', () => {
        expect(getByPath(obj, 'a.b.c')).toBe(42);
    });

    it('returns undefined for a missing path', () => {
        expect(getByPath(obj, 'a.b.missing')).toBeUndefined();
        expect(getByPath(obj, 'x.y.z')).toBeUndefined();
    });

    it('returns undefined when traversing through a non-object', () => {
        expect(getByPath({ a: 1 }, 'a.b')).toBeUndefined();
    });
});

describe('setByPath', () => {
    it('sets a value at a nested path, creating intermediates as needed', () => {
        const result = setByPath({}, 'a.b.c', 42);
        expect(result).toEqual({ a: { b: { c: 42 } } });
    });

    it('does not mutate the input object', () => {
        const original = { a: { b: 1 } };
        setByPath(original, 'a.b', 99);
        expect(original.a.b).toBe(1);
    });

    it('overwrites an existing value at the path', () => {
        const result = setByPath({ a: { b: 1 } }, 'a.b', 2);
        expect(result.a.b).toBe(2);
    });
});

describe('deepFreeze', () => {
    it('freezes the top-level object', () => {
        const obj = deepFreeze({ a: 1 });
        expect(Object.isFrozen(obj)).toBe(true);
    });

    it('freezes nested objects recursively', () => {
        const obj = deepFreeze({ a: { b: { c: 1 } } });
        expect(Object.isFrozen(obj.a)).toBe(true);
        expect(Object.isFrozen(obj.a.b)).toBe(true);
    });

    it('throws on mutation attempts (ES modules are always strict mode)', () => {
        const obj = deepFreeze({ a: 1 }) as { a: number };
        expect(() => {
            obj.a = 2;
        }).toThrow();
    });
});