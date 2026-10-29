const request = require('supertest');
const app = require('../src/app');
const Lector = require('../src/models/lector');

// Mock del modelo Lector para pruebas unitarias sin conexión a base de datos
jest.mock('../src/models/lector');

describe('Pruebas unitarias para el módulo de Lector (/api/lectores)', () => {
  const mockId = '60d21b4667d0d8992e610c85';
  const mockLector = { _id: mockId, matricula: 'LEC01', nombre: 'Ana Diaz', sancionado: false };

  beforeEach(() => jest.clearAllMocks());

  // ==========================================
  // URI: POST /api/lectores
  // ==========================================

  // Caso de éxito: crea un nuevo lector y responde con status 201
  test('POST /api/lectores - Debe registrar un lector exitosamente (201)', async () => {
    Lector.create.mockResolvedValue(mockLector);
    const res = await request(app).post('/api/lectores').send(mockLector);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockLector);
  });

  // Caso de error: validación fallida en los datos enviados
  test('POST /api/lectores - Debe retornar 400 ante error de validación', async () => {
    Lector.create.mockRejectedValue({ name: 'ValidationError', errors: { nombre: { message: 'Nombre obligatorio' } } });
    const res = await request(app).post('/api/lectores').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Caso de error: clave duplicada (matrícula o correo ya registrado)
  test('POST /api/lectores - Debe retornar 409 si la matrícula o correo ya existen', async () => {
    Lector.create.mockRejectedValue({ code: 11000, keyPattern: { matricula: 1 } });
    const res = await request(app).post('/api/lectores').send(mockLector);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ==========================================
  // URI: GET /api/lectores
  // ==========================================

  // Caso de éxito: obtiene la lista completa de lectores
  test('GET /api/lectores - Debe listar todos los lectores registrados (200)', async () => {
    Lector.find.mockResolvedValue([mockLector]);
    const res = await request(app).get('/api/lectores');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data).toEqual([mockLector]);
  });

  // Caso con filtro: aplica filtros por query params (ej. sancionado)
  test('GET /api/lectores - Debe filtrar lectores según query params (200)', async () => {
    Lector.find.mockResolvedValue([mockLector]);
    const res = await request(app).get('/api/lectores?sancionado=false');
    expect(res.status).toBe(200);
    expect(Lector.find).toHaveBeenCalledWith({ sancionado: false });
  });

  // ==========================================
  // URI: GET /api/lectores/:id
  // ==========================================

  // Caso de éxito: retorna un lector por su ID válido
  test('GET /api/lectores/:id - Debe obtener un lector existente por su ID (200)', async () => {
    Lector.findById.mockResolvedValue(mockLector);
    const res = await request(app).get(`/api/lectores/${mockId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockLector);
  });

  // Caso de error: ID no encontrado en la base de datos
  test('GET /api/lectores/:id - Debe retornar 404 si el lector no existe', async () => {
    Lector.findById.mockResolvedValue(null);
    const res = await request(app).get(`/api/lectores/${mockId}`);
    expect(res.status).toBe(404);
    expect(res.body.mensaje).toBe('Lector no encontrado');
  });

  // Caso de validación: formato de ID incorrecto
  test('GET /api/lectores/:id - Debe retornar 400 si el ID tiene formato inválido', async () => {
    const res = await request(app).get('/api/lectores/id-invalido');
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toBe('ID con formato inválido');
  });

  // ==========================================
  // URI: PUT /api/lectores/:id
  // ==========================================

  // Caso de éxito: actualiza campos de un lector existente
  test('PUT /api/lectores/:id - Debe actualizar los datos del lector exitosamente (200)', async () => {
    const actualizado = { ...mockLector, nombre: 'Ana Gómez' };
    Lector.findByIdAndUpdate.mockResolvedValue(actualizado);
    const res = await request(app).put(`/api/lectores/${mockId}`).send({ nombre: 'Ana Gómez' });
    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('Ana Gómez');
  });

  // Caso de error: lector a actualizar no existe
  test('PUT /api/lectores/:id - Debe retornar 404 si el lector a actualizar no existe', async () => {
    Lector.findByIdAndUpdate.mockResolvedValue(null);
    const res = await request(app).put(`/api/lectores/${mockId}`).send({ nombre: 'Ana' });
    expect(res.status).toBe(404);
    expect(res.body.mensaje).toBe('Lector no encontrado para actualizar');
  });

  // ==========================================
  // URI: PATCH /api/lectores/:id/sancion
  // ==========================================

  // Caso de éxito: actualiza únicamente el estado de sanción
  test('PATCH /api/lectores/:id/sancion - Debe actualizar el estado de sanción (200)', async () => {
    const sancionado = { ...mockLector, sancionado: true };
    Lector.findByIdAndUpdate.mockResolvedValue(sancionado);
    const res = await request(app).patch(`/api/lectores/${mockId}/sancion`).send({ sancionado: true });
    expect(res.status).toBe(200);
    expect(res.body.data.sancionado).toBe(true);
  });

  // Caso de error: el campo sancionado no es de tipo booleano
  test('PATCH /api/lectores/:id/sancion - Debe retornar 400 si sancionado no es booleano', async () => {
    const res = await request(app).patch(`/api/lectores/${mockId}/sancion`).send({ sancionado: 'si' });
    expect(res.status).toBe(400);
    expect(res.body.mensaje).toBe("El campo 'sancionado' debe ser booleano (true o false)");
  });

  // ==========================================
  // URI: DELETE /api/lectores/:id
  // ==========================================

  // Caso de éxito: elimina un lector por su ID
  test('DELETE /api/lectores/:id - Debe eliminar un lector existente (200)', async () => {
    Lector.findByIdAndDelete.mockResolvedValue(mockLector);
    const res = await request(app).delete(`/api/lectores/${mockId}`);
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe('Lector eliminado exitosamente');
  });

  // Caso de error: lector a eliminar no encontrado
  test('DELETE /api/lectores/:id - Debe retornar 404 si el lector a eliminar no existe', async () => {
    Lector.findByIdAndDelete.mockResolvedValue(null);
    const res = await request(app).delete(`/api/lectores/${mockId}`);
    expect(res.status).toBe(404);
    expect(res.body.mensaje).toBe('Lector no encontrado para eliminar');
  });
});
