const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/script.js"), "utf8");

function crearPagina() {
  const elementos = new Map();
  const pendientes = [];
  function nodo() {
    const clases = new Set();
    return {
      children: [], dataset: {}, style: {}, attributes: {}, hidden: true, textContent: "",
      classList: {
        add(nombre) { clases.add(nombre); },
        remove(nombre) { clases.delete(nombre); },
        contains(nombre) { return clases.has(nombre); },
      },
      setAttribute(nombre, valor) { this.attributes[nombre] = valor; },
      addEventListener(nombre, callback) { this.eventos ??= {}; this.eventos[nombre] = callback; },
      click() { return this.eventos.click(); },
      replaceChildren(...hijos) { this.children = hijos; },
      append(...hijos) { this.children.push(...hijos); },
      prepend(hijo) { this.children.unshift(hijo); },
      remove() {},
      get childElementCount() { return this.children.length; },
      get lastElementChild() { return this.children.at(-1); },
    };
  }
  const documento = {
    documentElement: nodo(), visibilityState: "visible", createElement: nodo,
    addEventListener() {},
    querySelector(selector) {
      if (!elementos.has(selector)) elementos.set(selector, nodo());
      return elementos.get(selector);
    },
  };
  vm.runInNewContext(script, {
    document: documento,
    location: { protocol: "http:", hostname: "127.0.0.1" },
    localStorage: { getItem: () => null },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    fetch: (url, options) => new Promise((resolve, reject) => pendientes.push({ url, options, resolve, reject })),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance: { now: () => 0 },
    AbortController, setTimeout, clearTimeout,
  });
  return { elementos, pendientes };
}

async function resolver(pagina, pendiente, datos) {
  pagina.pendientes.splice(pagina.pendientes.indexOf(pendiente), 1);
  pendiente.resolve({ ok: true, json: async () => datos });
  await new Promise(setImmediate);
}

function lista(estadoDos) {
  return {
    total_servidores: 3,
    servidores: [1, 2, 3].map((numero) => ({
      nombre: `Servidor ${numero}`, puerto: 8000 + numero,
      estado: numero === 2 ? estadoDos : "Activo",
    })),
  };
}

test("los controles de la UI alternan un servidor real y refrescan la API", async () => {
  const pagina = crearPagina();
  const control = pagina.pendientes.find((peticion) => peticion.url === "/__demo/estado");
  assert.ok(control, "la UI debe consultar el supervisor local");
  await resolver(pagina, control, {
    token: "sesion-local",
    servidores: [1, 2, 3].map((numero) => ({ numero, activo: true })),
  });
  await resolver(pagina, pagina.pendientes.find((item) => item.url.endsWith("/servidores")), lista("Activo"));
  await resolver(pagina, pagina.pendientes.find((item) => item.url.endsWith("/estadisticas")), {
    total_solicitudes: 0, Solicitudes_por_servidor: {},
  });
  assert.equal(pagina.elementos.get("#control-demo").hidden, false);
  const boton = pagina.elementos.get("#control-servidor-2");
  assert.equal(boton.textContent, "Detener servidor 2");
  const envio = boton.click();
  const peticion = pagina.pendientes.find((item) => item.url === "/__demo/servidor");
  assert.equal(peticion.options.method, "POST");
  assert.equal(peticion.options.headers["X-Aether-Token"], "sesion-local");
  assert.equal(peticion.options.body, '{"numero":2}');
  await resolver(pagina, peticion, { numero: 2, activo: false });
  const api = pagina.pendientes.find((item) => item.url.endsWith("/servidores"));
  await resolver(pagina, api, lista("Inactivo"));
  const estadisticas = pagina.pendientes.find((item) => item.url.endsWith("/estadisticas"));
  await resolver(pagina, estadisticas, { total_solicitudes: 0, Solicitudes_por_servidor: {} });
  await envio;
  assert.equal(boton.textContent, "Recuperar servidor 2");
  assert.equal(pagina.elementos.get("#tabla-servidores").children[1].children[2].textContent, "Inactivo");
});
