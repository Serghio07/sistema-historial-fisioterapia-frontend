import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationBadge, notificationDestination, INTERNAL_NOTIFICATION_POLL_MS } from '../src/utils/notificationUi.js';

test('badge se oculta en cero, muestra cantidad y limita a 99+', () => { assert.equal(notificationBadge(0), ''); assert.equal(notificationBadge(7), '7'); assert.equal(notificationBadge(100), '99+'); });
test('navega únicamente a una derivación real', () => { assert.deepEqual(notificationDestination({ derivacion_id: 18 }), { pathname: '/whatsapp/recepcion', state: { derivacionId: 18 } }); assert.equal(notificationDestination({}), null); });
test('polling moderado es de sesenta segundos', () => { assert.equal(INTERNAL_NOTIFICATION_POLL_MS, 60_000); });
