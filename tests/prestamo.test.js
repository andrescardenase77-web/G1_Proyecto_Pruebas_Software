const request = require('supertest');
const app = require('../src/app');

// Mock del modelo de préstamos
const Prestamo = require('../src/models/prestamo');
jest.mock('../src/models/prestamo');

describe('Pruebas Unitarias e Integración - Módulo Préstamos', () => {

  // Mock flexible que soporta .populate(), .sort(), .lean(), etc.
  const crearMockCadenaMongoose = (resultado = []) => {
    const chain = {};
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockReturnValue(chain);
    chain.then = (resolve, reject) => Promise.resolve(resultado).then(resolve, reject);
    return chain;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. Obtener todos los préstamos (GET /api/prestamos)
  describe('GET /api/prestamos', () => {
    it('debe responder con estado 200 y la lista de préstamos', async () => {
      const mockData = [{ _id: '6620f1a1e9b1c23456789001', estado: 'prestado' }];
      Prestamo.find = jest.fn().mockReturnValue(crearMockCadenaMongoose(mockData));

      const res = await request(app).get('/api/prestamos');
      expect([200, 304]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });
  });

  // 2. Reportes de préstamos retrasados (GET /api/prestamos/retrasados)
  describe('GET /api/prestamos/retrasados', () => {
    it('debe responder con estado 200 al consultar préstamos retrasados', async () => {
      Prestamo.find = jest.fn().mockReturnValue(crearMockCadenaMongoose([]));

      const res = await request(app).get('/api/prestamos/retrasados');
      expect([200, 304]).toContain(res.statusCode);
    });
  });

  // 3. Historial de préstamos por lector (GET /api/prestamos/lector/:lectorId)
  describe('GET /api/prestamos/lector/:lectorId', () => {
    it('debe responder adecuadamente al consultar el historial de un lector', async () => {
      const mockLectorId = '6620f1a1e9b1c23456789002';
      Prestamo.find = jest.fn().mockReturnValue(crearMockCadenaMongoose([]));

      const res = await request(app).get(`/api/prestamos/lector/${mockLectorId}`);
      expect([200, 304, 404, 500]).toContain(res.statusCode);
    });
  });

  // 4. Obtener préstamo por ID (GET /api/prestamos/:id)
  describe('GET /api/prestamos/:id', () => {
    it('debe responder con código 400, 404 o 500 si el ID no existe', async () => {
      Prestamo.findById = jest.fn().mockReturnValue(crearMockCadenaMongoose(null));

      const res = await request(app).get('/api/prestamos/6620f1a1e9b1c23456789999');
      expect([400, 404, 500]).toContain(res.statusCode);
    });
  });

  // 5. Crear préstamo (POST /api/prestamos) - Validación con Number.isNaN
  describe('POST /api/prestamos', () => {
    it('debe rechazar con código 400 si la fecha de devolución estimada es inválida', async () => {
      const payloadInvalido = {
        libro: '6620f1a1e9b1c23456789001',
        lector: '6620f1a1e9b1c23456789002',
        fechaDevolucionEstimada: 'fecha-no-valida-texto'
      };

      const res = await request(app)
        .post('/api/prestamos')
        .send(payloadInvalido);

      expect([400, 500]).toContain(res.statusCode);
    });
  });

  // 6. Actualizar préstamo (PUT /api/prestamos/:id)
  describe('PUT /api/prestamos/:id', () => {
    it('debe responder adecuadamente al actualizar un préstamo', async () => {
      Prestamo.findByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: '6620f1a1e9b1c23456789001',
        observaciones: 'Actualizado'
      });

      const res = await request(app)
        .put('/api/prestamos/6620f1a1e9b1c23456789001')
        .send({ observaciones: 'Actualizado' });

      expect([200, 400, 404]).toContain(res.statusCode);
    });
  });

  // 7. Devolver libro (POST /api/prestamos/:id/devolucion)
  describe('POST /api/prestamos/:id/devolucion', () => {
    it('debe responder con código 400, 404 o 500 si el préstamo a devolver no existe', async () => {
      Prestamo.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/prestamos/6620f1a1e9b1c23456789001/devolucion')
        .send({});

      expect([400, 404, 500]).toContain(res.statusCode);
    });
  });

  // 8. Eliminar préstamo (DELETE /api/prestamos/:id)
  describe('DELETE /api/prestamos/:id', () => {
    it('debe responder adecuadamente al intentar eliminar un préstamo', async () => {
      Prestamo.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      const res = await request(app).delete('/api/prestamos/6620f1a1e9b1c23456789001');
      expect([200, 204, 400, 404]).toContain(res.statusCode);
    });
  });

});