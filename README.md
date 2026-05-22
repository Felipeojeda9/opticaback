# OpticaBack

Backend para sistema de gestión de citas de óptica. Construido con NestJS, Prisma y PostgreSQL (Neon).

## Stack

- **Framework:** NestJS
- **ORM:** Prisma
- **Base de datos:** PostgreSQL (Neon)
- **Autenticación:** JWT + Passport
- **Validación:** class-validator

## Requisitos

- Node.js v20+
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://usuario:password@host/db?sslmode=require"
JWT_SECRET="tu_secret_aqui"
```

## Levantar el servidor

```bash
# desarrollo con hot reload
npm run start:dev

# producción
npm run start:prod
```

El servidor corre en `http://localhost:3000`.

## Tests

```bash
npm run test
```

## Endpoints

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Registrar usuario |
| POST | `/auth/login` | No | Iniciar sesión |
| GET | `/auth/me` | Bearer token | Obtener usuario actual |

### Citas

Todos los endpoints de citas requieren Bearer token.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/citas` | Obtener citas del usuario |
| POST | `/citas` | Crear cita |
| PATCH | `/citas/:id/cancelar` | Cancelar cita |
| GET | `/citas/disponibles` | Horarios disponibles |
| POST | `/citas/bloquear-slot` | Bloquear horario |
| POST | `/citas/bloquear-dia` | Bloquear día completo |
| DELETE | `/citas/dias-bloqueados/:id` | Desbloquear día |

### Usuarios

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/users/pacientes` | Bearer token | Listar pacientes |
| GET | `/users/profesionales` | Bearer token | Listar profesionales |

## Roles

- `PACIENTE` — requiere `rut` y `fechaNacimiento` al registrarse
- `PROFESIONAL` — requiere `rut` y `especialidad` al registrarse
- `ADMIN`

## Estructura

```
src/
├── auth/         # Autenticación JWT
├── citas/        # Gestión de citas
├── users/        # Usuarios, pacientes y profesionales
└── prisma/       # Cliente Prisma
```
