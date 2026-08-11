export const DEFAULT_API_BASE_URL = "http://192.168.1.11:8010";

const HEALTH_TIMEOUT_MS = 5_000;

export function normalizeApiBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    throw new Error("Indica o endereço do backend.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Usa um endereço completo, por exemplo http://192.168.1.11:8010.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("O endereço tem de começar por http:// ou https://.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("O endereço não pode incluir credenciais, parâmetros ou fragmentos.");
  }

  return trimmed;
}

export function backendUrl(baseUrl: string, path: string) {
  return `${normalizeApiBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`;
}

export async function testBackendConnection(baseUrl: string) {
  const normalizedUrl = normalizeApiBaseUrl(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(backendUrl(normalizedUrl, "/health"), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`O backend respondeu com o estado ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("ok" in data) ||
      data.ok !== true
    ) {
      throw new Error("A resposta de saúde do backend é inválida.");
    }

    return normalizedUrl;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("O backend não respondeu em 5 segundos.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
