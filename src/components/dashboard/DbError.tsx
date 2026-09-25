// Se muestra en el panel cuando falla la base de datos, con el motivo real
// (en producción Next.js oculta los errores de servidor tras un "digest").
export default function DbError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const hint = /does not exist|column|P2022|P2021/i.test(message)
    ? "Falta migrar la base de datos: GitHub → Actions → DB Migrate → Run workflow."
    : /tenant\/user .* not found|ENOTFOUND/i.test(message)
    ? "Supabase no encuentra el proyecto: probablemente está pausado por inactividad. Entra en supabase.com/dashboard, abre el proyecto y pulsa \"Restore project\"."
    : /Can't reach|P1001|ECONNREFUSED|timed out|P1017/i.test(message)
    ? "No se puede conectar con Supabase: revisa DATABASE_URL en Vercel y que el proyecto de Supabase no esté pausado."
    : /Authentication failed|P1000|password/i.test(message)
    ? "Usuario o contraseña de la base de datos incorrectos: revisa DATABASE_URL en Vercel."
    : !process.env.DATABASE_URL
    ? "Falta la variable DATABASE_URL en Vercel."
    : null;

  return (
    <div className="card">
      <h2>No se pudo leer la base de datos</h2>
      {hint && <p style={{ marginTop: 8 }}>{hint}</p>}
      <pre className="out">{message.replace(/postgres(ql)?:\/\/[^\s"']+/g, "postgresql://***")}</pre>
    </div>
  );
}
