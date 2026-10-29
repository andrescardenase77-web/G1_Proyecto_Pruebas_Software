const mongoose = require('mongoose');
const Autor = require('../src/models/autor');
const {
  listarAutores,
  obtenerAutor,
  crearAutor,
  actualizarAutor,
  eliminarAutor
} = require('../src/controllers/autorController');

// ID con formato válido de MongoDB (24 caracteres hexadecimales)
const ID_VALIDO = '507f1f77bcf86cd799439011';

// Simula el objeto "res" de Express para revisar qué responde el controlador
const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Valida un autor con las reglas del modelo; devuelve el error o undefined si es válido
const validar = async (datos) => {
  try {
    await new Autor(datos).validate();
    return undefined;
  } catch (error) {
    return error;
  }
};

// Después de cada prueba se quitan las simulaciones para que no afecten a la siguiente
afterEach(() => {
  jest.restoreAllMocks();
});

// ---------- PRUEBAS DEL MODELO (sin base de datos) ----------
describe('Modelo Autor', () => {
  test('es válido con datos correctos', async () => {
    const error = await validar({
      nombre: 'Gabriel García Márquez',
      nacionalidad: 'Colombiana',
      sitioWeb: 'https://gabo.com',
      anioNacimiento: 1927
    });
    expect(error).toBeUndefined();
  });

  test('falla si no tiene nombre', async () => {
    const error = await validar({ nacionalidad: 'Peruana' });
    expect(error.errors.nombre.message).toBe('El nombre es obligatorio');
  });

  test('falla si el sitio web no empieza con http:// o https://', async () => {
    const error = await validar({ nombre: 'Autor', sitioWeb: 'autor.com' });
    expect(error.errors.sitioWeb).toBeDefined();
  });

  test('falla si el año de nacimiento es futuro', async () => {
    const error = await validar({ nombre: 'Autor', anioNacimiento: 3000 });
    expect(error.errors.anioNacimiento.message).toBe('El año de nacimiento no puede ser futuro');
  });
});

// ---------- PRUEBAS DEL CONTROLADOR (la base de datos se simula con jest.spyOn) ----------
describe('Controlador Autor', () => {
  test('listarAutores responde 200 con la lista de autores', async () => {
    // Simulamos que la base de datos devuelve 2 autores
    jest.spyOn(Autor, 'find').mockResolvedValue([{ nombre: 'A1' }, { nombre: 'A2' }]);
    const res = crearRes();

    await listarAutores({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('obtenerAutor responde 400 si el ID no es válido', async () => {
    const res = crearRes();

    await obtenerAutor({ params: { id: '123' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('obtenerAutor responde 404 si el autor no existe', async () => {
    // Simulamos que no se encuentra ningún autor
    jest.spyOn(Autor, 'findById').mockResolvedValue(null);
    const res = crearRes();

    await obtenerAutor({ params: { id: ID_VALIDO } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('crearAutor responde 201 cuando se crea el autor', async () => {
    // No existe otro autor con ese nombre y la creación funciona
    jest.spyOn(Autor, 'exists').mockResolvedValue(null);
    jest.spyOn(Autor, 'create').mockResolvedValue({ _id: ID_VALIDO, nombre: 'Nuevo' });
    const res = crearRes();

    await crearAutor({ body: { nombre: 'Nuevo' } }, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('crearAutor responde 409 si el nombre ya existe', async () => {
    // Simulamos que ya hay un autor con ese nombre
    jest.spyOn(Autor, 'exists').mockResolvedValue({ _id: ID_VALIDO });
    const res = crearRes();

    await crearAutor({ body: { nombre: 'Repetido' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('actualizarAutor responde 200 cuando se actualiza', async () => {
    jest.spyOn(Autor, 'findByIdAndUpdate').mockResolvedValue({ _id: ID_VALIDO, nacionalidad: 'Chilena' });
    const res = crearRes();

    await actualizarAutor({ params: { id: ID_VALIDO }, body: { nacionalidad: 'Chilena' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('eliminarAutor responde 409 si el autor tiene libros', async () => {
    // Simulamos que la colección "libros" tiene 1 libro de este autor
    jest.spyOn(mongoose.connection, 'collection').mockReturnValue({
      countDocuments: jest.fn().mockResolvedValue(1)
    });
    const res = crearRes();

    await eliminarAutor({ params: { id: ID_VALIDO } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('eliminarAutor responde 200 cuando se elimina', async () => {
    // El autor no tiene libros y se borra correctamente
    jest.spyOn(mongoose.connection, 'collection').mockReturnValue({
      countDocuments: jest.fn().mockResolvedValue(0)
    });
    jest.spyOn(Autor, 'findByIdAndDelete').mockResolvedValue({ _id: ID_VALIDO });
    const res = crearRes();

    await eliminarAutor({ params: { id: ID_VALIDO } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
