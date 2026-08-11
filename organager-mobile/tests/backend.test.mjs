import assert from "node:assert/strict";
import test from "node:test";

import {
  backendUrl,
  normalizeApiBaseUrl,
  testBackendConnection,
} from "../services/backend.ts";

test("normaliza o endereço do backend", () => {
  assert.equal(
    normalizeApiBaseUrl("  http://192.168.1.11:8010///  "),
    "http://192.168.1.11:8010"
  );
  assert.equal(
    backendUrl("http://192.168.1.11:8010/", "/health"),
    "http://192.168.1.11:8010/health"
  );
});

test("rejeita endereços vazios ou sem protocolo HTTP", () => {
  assert.throws(() => normalizeApiBaseUrl(""), /Indica o endereço/);
  assert.throws(() => normalizeApiBaseUrl("192.168.1.11:8010"), /endereço completo/);
  assert.throws(() => normalizeApiBaseUrl("ftp://192.168.1.11"), /http:\/\//);
});

test("o teste de ligação valida a resposta de saúde", async (context) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({ ok: true }),
    };
  };

  const normalized = await testBackendConnection("http://10.0.0.5:8010/");
  assert.equal(normalized, "http://10.0.0.5:8010");
  assert.equal(requestedUrl, "http://10.0.0.5:8010/health");
});

test("o teste de ligação rejeita uma resposta inválida", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: false }),
  });

  await assert.rejects(
    () => testBackendConnection("http://10.0.0.5:8010"),
    /resposta de saúde.*inválida/i
  );
});
