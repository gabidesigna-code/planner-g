/**
 * Só aceitamos inscrições que apontam para os serviços de push dos navegadores (Chrome/Android, Firefox, Safari/iOS,
 * Edge). Sem isso, alguém poderia cadastrar como "aparelho" um endereço qualquer e fazer o NOSSO servidor chamá-lo
 * (SSRF). A checagem vale na inscrição e de novo no envio.
 */
const ALLOWED_HOSTS: RegExp[] = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/,
];

export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
}
