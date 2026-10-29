require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

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

  // Test 1: Obtener lista general de libros
  test('1. GET /api/libros debe retornar la lista de libros exitosamente (200)', async () => {
    const res = await request(app).get('/api/libros');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ==========================================
  // BLOQUE 2: CREACIÓN (POST /api/libros)
  // ==========================================

  // Test 2: Creación exitosa de un libro con datos válidos
  test('2. POST /api/libros debe registrar un nuevo libro con datos válidos (201)', async () => {
    const nuevoLibro = {
      isbn: '9780140449136',
      titulo: 'Crimen y Castigo',
      anio: 1866,
      ejemplaresDisponibles: 4,
      autorId: [autorIdValido]
    };

    const res = await request(app).post('/api/libros').send(nuevoLibro);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('mensaje', 'Libro registrado exitosamente');
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.titulo).toBe('Crimen y Castigo');
    expect(res.body.data.isbn).toBe('9780140449136');
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

  // Test 5: Rechazo si el autor referenciado no existe
  test('5. POST /api/libros debe fallar con 404 si el autor especificado no existe', async () => {
    const idAutorInexistente = new mongoose.Types.ObjectId().toString();
    const libroAutorInexistente = {
      isbn: '9780140449138',
      titulo: 'Libro Sin Autor Real',
      anio: 2010,
      ejemplaresDisponibles: 3,
      autorId: [idAutorInexistente]
    };

    const res = await request(app).post('/api/libros').send(libroAutorInexistente);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/autor especificado no existe/i);
  });

  // Test 6: Rechazo por clave duplicada (ISBN ya registrado)
  test('6. POST /api/libros debe fallar con 409 si se intenta registrar un ISBN duplicado', async () => {
    const libroDuplicado = {
      isbn: '9780307474728', // ISBN de Cien Años de Soledad insertado previamente
      titulo: 'Cien Años de Soledad (Copia Duplicada)',
      anio: 1967,
      ejemplaresDisponibles: 2,
      autorId: [autorIdValido]
    };

    const res = await request(app).post('/api/libros').send(libroDuplicado);

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/ya existe un libro con ese isbn|ya existe un registro/i);
  });

  // ==========================================
  // BLOQUE 3: CONSULTA POR ID (GET /api/libros/:id)
  // ==========================================

  // Test 7: Consulta de un libro existente por su ID
  test('7. GET /api/libros/:id debe retornar el libro correspondiente al ID consultado (200)', async () => {
    const res = await request(app).get(`/api/libros/${libroExistenteId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('_id', libroExistenteId);
    expect(res.body.data).toHaveProperty('titulo');
    expect(res.body.data).toHaveProperty('isbn');
  });

  // Test 8: Rechazo si el ID enviado no tiene formato válido de MongoDB
  test('8. GET /api/libros/:id debe fallar con 400 si el ID enviado tiene formato inválido', async () => {
    const res = await request(app).get('/api/libros/id-totalmente-invalido');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/formato inválido/i);
  });

  // Test 9: Rechazo si el ID tiene formato válido pero no existe en la BD
  test('9. GET /api/libros/:id debe retornar 404 si el ID es válido pero no existe', async () => {
    const idValidoInexistente = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/libros/${idValidoInexistente}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.mensaje).toMatch(/libro no encontrado/i);
  });

  // ==========================================
  // BLOQUE 4: ACTUALIZACIÓN Y ELIMINACIÓN
  // ==========================================

  // Test 10: Actualización de campos de un libro existente
  test('10. PUT /api/libros/:id debe actualizar campos de un libro existente (200)', async () => {
    const datosActualizados = {
      titulo: 'Cien Años de Soledad (Edición Ilustrada)',
      ejemplaresDisponibles: 10
    };

    const res = await request(app)
      .put(`/api/libros/${libroExistenteId}`)
      .send(datosActualizados);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('mensaje', 'Libro actualizado exitosamente');
    expect(res.body.data.titulo).toBe('Cien Años de Soledad (Edición Ilustrada)');
    expect(res.body.data.ejemplaresDisponibles).toBe(10);
  });

  // Test 11: Eliminación exitosa de un libro sin préstamos activos
  test('11. DELETE /api/libros/:id debe eliminar un libro que no tenga préstamos activos (200)', async () => {
    // 1. Creamos un libro temporal exclusivo para eliminar
    const libroParaEliminar = {
      isbn: '9786073115456',
      titulo: 'Libro Temporal Para Eliminar',
      anio: 2015,
      ejemplaresDisponibles: 1,
      autorId: [autorIdValido]
    };
    const crearRes = await request(app).post('/api/libros').send(libroParaEliminar);
    const libroCreadoId = crearRes.body.data._id;

    // 2. Ejecutamos la eliminación
    const res = await request(app).delete(`/api/libros/${libroCreadoId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('mensaje', 'Libro eliminado exitosamente');

    // 3. Confirmamos que ya no existe (404)
    const busquedaRes = await request(app).get(`/api/libros/${libroCreadoId}`);
    expect(busquedaRes.statusCode).toBe(404);
  });
});

