# G1 Proyecto Pruebas de Software

API en Node.js + Express con MongoDB (Mongoose), estructura MVC.

## Configuración inicial

1. Clonar el repositorio (o hacer `git pull` si ya lo tienes).
2. Instalar dependencias:
   ```
   npm install
   ```
3. Crear tu archivo `.env` a partir de la plantilla:
   ```
   copy .env.example .env
   ```
4. Abrir `.env` y poner en `MONGO_URI=` el link del cluster (se comparte por el grupo, **nunca** se sube a GitHub).
5. Levantar el servidor:
   ```
   npm run dev
   ```
   Debe aparecer `MongoDB conectado: ...`.

Si aparece un error de timeout al conectar, tu IP no está permitida en MongoDB Atlas: pedir que la agreguen en **Network Access**.

## Scripts

| Comando         | Descripción                              |
| --------------- | ---------------------------------------- |
| `npm start`     | Inicia el servidor                       |
| `npm run dev`   | Inicia el servidor con nodemon (recarga) |
| `npm test`      | Ejecuta las pruebas con Jest             |

## Estructura

```
src/
  config/       conexión a la base de datos
  controllers/  lógica de cada ruta
  models/       modelos de Mongoose
  routes/       definición de rutas
  views/        vistas
  app.js        configuración de Express
  server.js     punto de entrada (conecta a Mongo y levanta el servidor)
tests/          pruebas
```
