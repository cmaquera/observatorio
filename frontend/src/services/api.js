import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

export const getKpis = async (params = {}) => {
  const res = await api.get('/dashboard/kpis', { params });
  return res.data;
};

export const getCriticos = async (params = {}) => {
  const res = await api.get('/dashboard/criticos', { params });
  return res.data;
};

export const getSectores = async (params = {}) => {
  const res = await api.get('/dashboard/sectores', { params });
  return res.data;
};

export const getDepartamentos = async () => {
  const res = await api.get('/geo/departamentos');
  return res.data;
};

export const getProvincias = async (departamento) => {
  if (!departamento) return [];
  const res = await api.get('/geo/provincias', { params: { departamento } });
  return res.data;
};

export const getDistritos = async (departamento, provincia) => {
  if (!departamento || !provincia) return [];
  const res = await api.get('/geo/distritos', { params: { departamento, provincia } });
  return res.data;
};

export const getObras = async (params = {}) => {
  const res = await api.get('/obras', { params });
  return res.data;
};

export const getObraDetalle = async (cui) => {
  const res = await api.get(`/obras/${cui}`);
  return res.data;
};

export const getMapPoints = async (params = {}) => {
  const res = await api.get('/obras/map/points', { params });
  return res.data;
};

export const getEmpresas = async (params = {}) => {
  const res = await api.get('/empresas', { params });
  return res.data;
};

export const getExportCsvUrl = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return `/api/export/csv?${query}`;
};

export default api;
