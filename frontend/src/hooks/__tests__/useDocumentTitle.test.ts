import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  test('sets the document title', () => {
    document.title = 'Antes';
    renderHook(() => useDocumentTitle('Historial de pedidos · Agloval'));
    expect(document.title).toBe('Historial de pedidos · Agloval');
  });

  test('updates the title when it changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Uno' },
    });
    rerender({ title: 'Dos' });
    expect(document.title).toBe('Dos');
  });
});
