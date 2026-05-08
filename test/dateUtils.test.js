// =============================================
// Testes: dateUtils.js — Estado Atual
// =============================================
import { describe, it, expect } from 'vitest';
import { parseDateToNoon } from '../src/utils/dateUtils.js';

describe('parseDateToNoon', () => {
  it('deve converter string "YYYY-MM-DD" para Date ao meio-dia', () => {
    const result = parseDateToNoon('2025-06-15');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5); // Junho = 5 (zero-based)
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('deve tratar janeiro corretamente (mês 01 → index 0)', () => {
    const result = parseDateToNoon('2025-01-01');
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it('deve tratar dezembro corretamente (mês 12 → index 11)', () => {
    const result = parseDateToNoon('2025-12-31');
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it('deve retornar data atual se receber string vazia', () => {
    const before = new Date();
    const result = parseDateToNoon('');
    const after = new Date();
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('deve retornar data atual se receber null', () => {
    const before = new Date();
    const result = parseDateToNoon(null);
    const after = new Date();
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
