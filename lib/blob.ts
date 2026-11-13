// Vercel Blob se puede conectar de dos formas: con BLOB_READ_WRITE_TOKEN (tiendas antiguas)
// o con BLOB_STORE_ID, que en Vercel se autentica sola con la credencial OIDC del proyecto.
export const hayBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
