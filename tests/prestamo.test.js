const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

const Prestamo = require('../src/models/prestamo');
const Libro = require('../src/models/libro');
const Lector = require('../src/models/lector');

const idValido = new mongoose.Types.ObjectId().toString();
const libroIdValido = new mongoose.Types.ObjectId().toString();
const lectorIdValido = new mongoose.Types.ObjectId().toString();

const crearQueryMock = (resultado) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  then: (resolve) => Promise.resolve(resultado).then(resolve)
});

describe('Pruebas unitarias controladas - prestamoController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. GET /api/prestamos
  test('GET /api/prestamos - debe responder con listado general (200)', async () => {
    jest.spyOn(Prestamo, 'find').mockReturnValue(crearQueryMock([{ _id: idValido, estado: 'Activo' }]));
    const res = await request(app).get('/api/prestamos');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 2. GET /api/prestamos/retrasados
  test('GET /api/prestamos/retrasados - debe retornar prestamos en mora (200)', async () => {
    jest.spyOn(Prestamo, 'find').mockReturnValue(crearQueryMock([{ _id: idValido, estado: 'Activo' }]));
    const res = await request(app).get('/api/prestamos/retrasados');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. GET /api/prestamos/lector/:lectorId
  test('GET /api/prestamos/lector/:lectorId - debe retornar historial (200)', async () => {
    jest.spyOn(Prestamo, 'find').mockReturnValue(crearQueryMock([{ _id: idValido }]));
    const res = await request(app).get(`/api/prestamos/lector/${lectorIdValido}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/prestamos/lector/:lectorId - debe rechazar ID invalido (400)', async () => {
    const res = await request(app).get('/api/prestamos/lector/id-invalido-123');
    expect(res.status).toBe(400);
  });

  // 4. GET /api/prestamos/:id
  test('GET /api/prestamos/:id - debe obtener prestamo por ID (200)', async () => {
    jest.spyOn(Prestamo, 'findById').mockReturnValue(crearQueryMock({ _id: idValido }));
    const res = await request(app).get(`/api/prestamos/${idValido}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/prestamos/:id - debe retornar 404 si no existe', async () => {
    jest.spyOn(Prestamo, 'findById').mockReturnValue(crearQueryMock(null));
    const res = await request(app).get(`/api/prestamos/${idValido}`);
    expect(res.status).toBe(404);
  });

  // 5. POST /api/prestamos
  test('POST /api/prestamos - debe rechazar fecha no valida (400)', async () => {
    const res = await request(app).post('/api/prestamos').send({
      libro: libroIdValido,
      lector: lectorIdValido,
      fechaDevolucionEstimada: 'fecha-erronea'
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/prestamos - debe rechazar fecha en el pasado (400)', async () => {
    const res = await request(app).post('/api/prestamos').send({
      libro: libroIdValido,
      lector: lectorIdValido,
      fechaDevolucionEstimada: new Date('2020-01-01')
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/prestamos - debe rechazar si no hay stock del libro (400)', async () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 5);

    jest.spyOn(Lector, 'findById').mockResolvedValue({ _id: lectorIdValido, sancionado: false });
    jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Libro, 'findById').mockResolvedValue({ _id: libroIdValido, ejemplaresDisponibles: 0 });

    const res = await request(app).post('/api/prestamos').send({
      libro: libroIdValido,
      lector: lectorIdValido,
      fechaDevolucionEstimada: fechaFutura
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/prestamos - debe registrar prestamo exitosamente (201)', async () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 7);

    jest.spyOn(Lector, 'findById').mockResolvedValue({ _id: lectorIdValido, sancionado: false });
    jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(1);
    jest.spyOn(Libro, 'findById').mockResolvedValue({ _id: libroIdValido, ejemplaresDisponibles: 3 });
    jest.spyOn(Libro, 'findByIdAndUpdate').mockResolvedValue({});
    jest.spyOn(Prestamo.prototype, 'save').mockResolvedValue({ _id: idValido, estado: 'Activo' });

    const res = await request(app).post('/api/prestamos').send({
      libro: libroIdValido,
      lector: lectorIdValido,
      fechaDevolucionEstimada: fechaFutura,
      observaciones: 'Prueba de laboratorio'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // 6. POST /api/prestamos/:id/devolucion
  test('POST /api/prestamos/:id/devolucion - debe procesar devolucion a tiempo (200)', async () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 3);

    const prestamoActivo = {
      _id: idValido,
      estado: 'Activo',
      libro: libroIdValido,
      lector: lectorIdValido,
      fechaDevolucionEstimada: fechaFutura,
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(Prestamo, 'findById').mockResolvedValue(prestamoActivo);
    jest.spyOn(Libro, 'findByIdAndUpdate').mockResolvedValue({});

    const res = await request(app).post(`/api/prestamos/${idValido}/devolucion`);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Devolución procesada con éxito');
  });

  test('POST /api/prestamos/:id/devolucion - debe rechazar si ya fue devuelto (400)', async () => {
    jest.spyOn(Prestamo, 'findById').mockResolvedValue({ _id: idValido, estado: 'Devuelto' });
    const res = await request(app).post(`/api/prestamos/${idValido}/devolucion`);
    expect(res.status).toBe(400);
  });

  // 7. PUT /api/prestamos/:id
  test('PUT /api/prestamos/:id - debe actualizar prestamo (200)', async () => {
    jest.spyOn(Prestamo, 'findByIdAndUpdate').mockResolvedValue({ _id: idValido, observaciones: 'Nota actualizada' });
    const res = await request(app).put(`/api/prestamos/${idValido}`).send({ observaciones: 'Nota actualizada' });
    expect(res.status).toBe(200);
  });

  // 8. DELETE /api/prestamos/:id
  test('DELETE /api/prestamos/:id - debe eliminar prestamo (200)', async () => {
    jest.spyOn(Prestamo, 'findById').mockResolvedValue({ _id: idValido, estado: 'Devuelto' });
    jest.spyOn(Prestamo, 'findByIdAndDelete').mockResolvedValue({});
    const res = await request(app).delete(`/api/prestamos/${idValido}`);
    expect(res.status).toBe(200);
  });
});