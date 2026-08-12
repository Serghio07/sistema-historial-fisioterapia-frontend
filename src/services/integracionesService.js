import api from './api';

export const getGoogleStatus = async () => (
  await api.get('/google-calendar/status', { hideErrorToast: true })
).data;

export const getGoogleAuthUrl = async () => (
  await api.get('/google-calendar/auth', { hideErrorToast: true })
).data;

export const disconnectGoogle = async () => (
  await api.post('/google-calendar/disconnect', undefined, {
    hideErrorToast: true,
    showSuccessToast: false
  })
).data;

export const getWhatsAppStatus = async () => (
  await api.get('/whatsapp/status', { hideErrorToast: true })
).data;

export const verifyWhatsApp = async () => (
  await api.post('/whatsapp/verify-connection', undefined, {
    hideErrorToast: true,
    showSuccessToast: false
  })
).data;

export const sendWhatsAppTest = async (to) => (
  await api.post('/whatsapp/send-test', { to }, {
    hideErrorToast: true,
    showSuccessToast: false
  })
).data;
