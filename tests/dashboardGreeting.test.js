import test from 'node:test';
import assert from 'node:assert/strict';
import { firstNameForUser, greetingForBolivia } from '../src/pages/dashboard/dashboardGreeting.js';

test('cambia el saludo según la hora de Bolivia', () => {
  assert.equal(greetingForBolivia(new Date('2026-08-05T13:00:00Z')), 'Buenos días');
  assert.equal(greetingForBolivia(new Date('2026-08-05T16:00:00Z')), 'Buenas tardes');
  assert.equal(greetingForBolivia(new Date('2026-08-05T23:00:00Z')), 'Buenas noches');
  assert.equal(greetingForBolivia(new Date('2026-08-05T06:00:00Z')), 'Buenas noches');
});

test('prioriza el nombre real y omite títulos profesionales', () => {
  assert.equal(firstNameForUser({ ficha_personal: { nombres: 'Adolfo Dávila' }, nombre: 'Doc. Ft. Adolfo' }), 'Adolfo');
  assert.equal(firstNameForUser({ nombre: 'Doc. Ft. Sergio Pérez' }), 'Sergio');
  assert.equal(firstNameForUser(null), '');
});
