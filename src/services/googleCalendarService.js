import api from './api';

export const getGoogleCalendarStatus = async () => {
  const { data } = await api.get('/google-calendar/status');
  return data;
};

export const getGoogleCalendarAuth = async () => {
  const { data } = await api.get('/google-calendar/auth');
  return data;
};

export const disconnectGoogleCalendar = async () => {
  const { data } = await api.post('/google-calendar/disconnect');
  return data;
};