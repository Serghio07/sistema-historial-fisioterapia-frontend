import fs from 'node:fs/promises';
import path from 'node:path';

const user = process.env.SIMULATOR_VISUAL_USER;
const password = process.env.SIMULATOR_VISUAL_PASSWORD;
const appUrl = process.env.SIMULATOR_VISUAL_URL || 'http://localhost:5175';
const debugPort = process.env.CHROME_DEBUG_PORT || '9333';
if (!user || !password) throw new Error('Faltan credenciales visuales temporales.');

const target = await fetch(
  `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${appUrl}/login`)}`,
  { method: 'PUT' }
).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, timeout = 10000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
};
const setInput = (selector, value) => evaluate(`(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(element, ${JSON.stringify(value)});
  element.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
const clickText = (text) => evaluate(`(() => {
  const element = [...document.querySelectorAll('button')].find((item) => item.textContent.trim().includes(${JSON.stringify(text)}));
  if (!element) return false;
  element.click();
  return true;
})()`);

await cdp('Page.enable');
await cdp('Runtime.enable');
await waitFor(`document.querySelectorAll('input').length >= 2`);
await setInput('input:not([type="password"])', user);
await setInput('input[type="password"]', password);
await clickText('Iniciar sesión');
await waitFor(`location.pathname !== '/login'`, 15000);

await cdp('Page.navigate', { url: `${appUrl}/configuracion/whatsapp/simulador` });
await waitFor(`document.body.innerText.includes('Simulador de agendamiento')`, 15000);
await setInput('input[placeholder="59170000000"]', `59176${String(Date.now()).slice(-7)}`);
await clickText('Iniciar conversación');
await waitFor(`document.body.innerText.includes('¿Para quién deseas realizar la reserva?')`, 15000);
await clickText('Para otra persona');
await waitFor(`document.body.innerText.includes('Indica el nombre de la persona')`, 15000);

const artifacts = path.resolve('artifacts');
await fs.mkdir(artifacts, { recursive: true });
const desktop = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await fs.writeFile(path.join(artifacts, 'whatsapp-simulator-desktop.png'), Buffer.from(desktop.data, 'base64'));

const desktopEvidence = await evaluate(`({
  title: document.querySelector('h1')?.textContent,
  warning: document.body.innerText.includes('no envía mensajes reales'),
  database: document.body.innerText.includes('physio_whatsapp_test'),
  conversation: document.body.innerText.includes('Indica el nombre de la persona'),
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  tokensVisible: /ACCESS_TOKEN|WEBHOOK_SECRET|VERIFY_TOKEN/.test(document.body.innerText)
})`);

await cdp('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await new Promise((resolve) => setTimeout(resolve, 400));
const mobile = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await fs.writeFile(path.join(artifacts, 'whatsapp-simulator-mobile.png'), Buffer.from(mobile.data, 'base64'));
const mobileEvidence = await evaluate(`({
  width: window.innerWidth,
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  messageInputVisible: Boolean(document.querySelector('input[placeholder*="Escribe un mensaje"]')),
  technicalPanelVisible: document.body.innerText.includes('Información técnica')
})`);

await cdp('Page.close');
socket.close();
console.log(JSON.stringify({ desktopEvidence, mobileEvidence }, null, 2));
