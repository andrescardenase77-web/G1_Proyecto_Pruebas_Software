require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

jest.setTimeout(15000);

describe('Pruebas Unitarias - Módulo de Libros (/api/libros)', () => {
  let autorIdValido;
  let libroExistenteId;

  // 1. Conexión previa y obtención de datos base
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

    // Limpieza preventiva: si una ejecución previa falló o se canceló, eliminamos residuos
    await mongoose.connection.collection('libros').deleteMany({
      isbn: { $in: ['9780140449136', '9786073115456'] }
    });

    // Obtener un autor existente para asociar en las pruebas
    const autor = await mongoose.connection.collection('autores').findOne({});
    if (autor) {
      autorIdValido = autor._id.toString();
    }

    // Obtener un libro existente para pruebas de consulta y actualización
    const libro = await mongoose.connection.collection('libros').findOne({});
    if (libro) {
      libroExistenteId = libro._id.toString();
    }
  });

  // 2. Cierre de conexión al finalizar todos los tests
  afterAll(async () => {
    // Limpieza de libros temporales creados exclusivamente por los tests
    await mongoose.connection.collection('libros').deleteMany({
      isbn: { $in: ['9780140449136', '9786073115456'] }
    });
    await mongoose.connection.close();
  });

  // ==========================================
  // BLOQUE 1: LISTADO (GET /api/libros)
  // ==========================================

  // Test 1: Manejo de error al listar libros con autorId inválido
  test('1. GET /api/libros debe fallar con 400 si el filtro autorId tiene formato inválido', async () => {
    const res = await request(app).get('/api/libros?autorId=id-no-valido');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/inválido/i);
  });

  // ==========================================
  // BLOQUE 2: CREACIÓN (POST /api/libros)
  // ==========================================

  // Test 2: Rechazo si el cuerpo está vacío
  test('2. POST /api/libros debe fallar con 400 si el cuerpo de la petición está vacío', async () => {
    const res = await request(app).post('/api/libros').send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
  });

  // Test 3: Rechazo si falta el campo obligatorio 'titulo'
  test('3. POST /api/libros debe fallar con 400 si falta el título del libro', async () => {
    const libroIncompleto = {
      isbn: '9780140449137',
      anio: 1999,
      ejemplaresDisponibles: 2,
      autorId: [autorIdValido]
    };

    const res = await request(app).post('/api/libros').send(libroIncompleto);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/título/i);
  });

  // Test 4: Rechazo si el formato del ISBN es inválido
  test('4. POST /api/libros debe fallar con 400 si el ISBN tiene un formato inválido', async () => {
    const libroIsbnInvalido = {
      isbn: 'isbn-invalido-123',
      titulo: 'Libro Con ISBN Erróneo',
      anio: 2005,
      ejemplaresDisponibles: 1,
      autorId: [autorIdValido]
    };

    const res = await request(app).post('/api/libros').send(libroIsbnInvalido);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/ISBN/i);
  });

  // Test 5: Rechazo si el autor enviado tiene formato inválido
  test('5. POST /api/libros debe fallar con 400 si el autor especificado tiene formato inválido', async () => {
    const libroAutorInvalido = {
      isbn: '9780140449138',
      titulo: 'Libro Con Autor Invalido',
      anio: 2010,
      ejemplaresDisponibles: 3,
      autorId: ['id-autor-no-valido']
    };

    const res = await request(app).post('/api/libros').send(libroAutorInvalido);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // Test 6: Rechazo si el año de publicación es futuro
  test('6. POST /api/libros debe fallar con 400 si el año de publicación es futuro', async () => {
    const libroAnioFuturo = {
      isbn: '9780140449139',
      titulo: 'Libro Del Futuro',
      anio: 2099,
      ejemplaresDisponibles: 2,
      autorId: [autorIdValido]
    };

    const res = await request(app).post('/api/libros').send(libroAnioFuturo);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/año|futuro/i);
  });

  // ==========================================
  // BLOQUE 3: CONSULTA POR ID (GET /api/libros/:id)
  // ==========================================

  // Test 7: Validación de formato al consultar libro por ID
  test('7. GET /api/libros/:id debe fallar con 400 si el ID tiene formato inválido', async () => {
    const res = await request(app).get('/api/libros/id-formato-incorrecto');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // Test 8: Rechazo si el ID enviado no tiene formato válido de MongoDB
  test('8. GET /api/libros/:id debe fallar con 400 si el ID enviado es numérico simple', async () => {
    const res = await request(app).get('/api/libros/12345');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // Test 9: Rechazo si el ID tiene formato inválido al consultar
  test('9. GET /api/libros/:id debe fallar con 400 si el ID contiene caracteres especiales', async () => {
    const res = await request(app).get('/api/libros/@id-invalido!');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // ==========================================
  // BLOQUE 4: ACTUALIZACIÓN Y ELIMINACIÓN
  // ==========================================

  // Test 10: Validación de ID al actualizar
  test('10. PUT /api/libros/:id debe fallar con 400 si el ID enviado tiene formato inválido', async () => {
    const res = await request(app)
      .put('/api/libros/id-invalido-actualizar')
      .send({ titulo: 'Intento Actualización' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // Test 11: Validación de ID al eliminar
  test('11. DELETE /api/libros/:id debe fallar con 400 si el ID enviado tiene formato inválido', async () => {
    const res = await request(app).delete('/api/libros/id-invalido-eliminar');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });
});

