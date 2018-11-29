export function fail(message: string): never {
    console.error(message);
    process.exit(1);
    throw new Error('unreachable');
}

export function expectNumber(x: unknown, message: string): number {
    const n = typeof x === 'number' ? x : Number(x);
    if (isFinite(n)) {
        return n;
    }
    return fail(`${message}: expected number, got ${x}`);
}
