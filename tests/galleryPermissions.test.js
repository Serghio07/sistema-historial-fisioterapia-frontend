import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessModule, canPerformAction } from '../src/config/permissions.js';

test('Galería está habilitada para admin y personal', () => {
  assert.equal(canAccessModule('admin', 'galeria'), true);
  assert.equal(canAccessModule('personal', 'galeria'), true);
  assert.equal(canPerformAction('personal', 'galeria', 'publish'), true);
  assert.equal(canPerformAction('personal', 'galeria', 'annul'), true);
});
