# Publicar en Vercel con Neon

Pasos para poner el sitio en línea por primera vez. Se hacen una sola vez.

## 1. Importar el proyecto en Vercel
1. En [vercel.com](https://vercel.com) → **Add New… → Project** → elige el repositorio `aneloescenico-web`.
2. Vercel detecta Next.js. No cambies los comandos de build.
3. Antes de pulsar Deploy, completa los pasos 2 a 4 (o despliega y vuelve a desplegar después).

## 2. Conectar Neon
1. En el proyecto de Vercel → **Storage → Create Database → Neon**.
2. Al terminar, Vercel agrega sola la variable `DATABASE_URL`.

Las tablas se crean solas: cada build ejecuta `scripts/migrar.mjs`, que aplica las migraciones y crea los niveles Kids, Teen y Teenagers la primera vez.

## 3. Conectar Vercel Blob (fotos)
1. **Storage → Create Database → Blob**.
2. Vercel agrega sola la variable `BLOB_READ_WRITE_TOKEN`.

## 4. Variables de entorno
En **Settings → Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | Texto aleatorio de 32 caracteres o más. Se genera con `openssl rand -base64 32`. |
| `MASTER_EMAIL` | Correo del usuario master. |
| `MASTER_PASSWORD` | Clave del usuario master. Usa una larga. |

Opcionales: `RESEND_API_KEY` y `CORREO_REMITENTE` (avisos por correo al comprador) y `SITIO_URL` (dirección pública para los enlaces de esos correos).

El usuario master se crea la primera vez que alguien intenta ingresar y todavía no existe ningún usuario. Después de ese primer ingreso, `MASTER_PASSWORD` ya no se usa y se puede borrar de Vercel.

## 5. Desplegar y entrar
1. **Deployments → Redeploy** (para que tome las variables).
2. Abre `https://tu-dominio/ingresar` y entra con el correo y la clave master.
3. Sigue la guía **Primeros pasos** del panel.

## Trabajar en tu computadora

```bash
npm install
```

```bash
cp .env.example .env.local
```

Completa `.env.local` (puedes usar la cadena de conexión de una rama de Neon) y luego:

```bash
npm run db:migrar
```

```bash
npm run dev
```

Sin `BLOB_READ_WRITE_TOKEN`, en desarrollo las fotos se guardan en `public/uploads/`.

## Cambiar la base de datos

1. Edita `db/schema.ts`.
2. Genera la migración:

```bash
npm run db:generar
```

3. Sube el cambio. El siguiente build la aplica.
