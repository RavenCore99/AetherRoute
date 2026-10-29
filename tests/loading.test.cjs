const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/script.js"), "utf8");

function crearPagina() {
  const elementos = new Map();
  const pendientes = [];
  function nodo(etiqueta = "div") {
    const clases = new Set();
    return {
      etiqueta,
      children: [],
      hidden: true,
      textContent: "",
      attributes: {},
      classList: {
        add: (nombre) => clases.add(nombre),
        remove: (nombre) => clases.delete(nombre),
        contains: (nombre) => clases.has(nombre),
      },
      setAttribute(nombre, valor) { this.attributes[nombre] = valor; },
      removeAttribute(nombre) { delete this.attributes[nombre]; },
      addEventListener(_nombre, callback) { this.alClic = callback; },
      click() { return this.alClic(); },
      append(...hijos) { this.children.push(...hijos); },
      prepend(hijo) { this.children.unshift(hijo); },
      replaceChildren(...hijos) { this.children = hijos; },
      remove() {},
      get childElementCount() { return this.children.length; },
      get lastElementChild() { return this.children.at(-1); },
    };
  }
  const documento = {
    documentElement: { dataset: {} },
    createElement: nodo,
    querySelector(selector) {
      if (!elementos.has(selector)) elementos.set(selector, nodo());
      return elementos.get(selector);
    },
  };
  vm.runInNewContext(script, {
    document: documento,
    location: { protocol: "http:" },
    localStorage: { getItem: () => null },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: (url) => new Promise((resolve, reject) => pendientes.push({ url, resolve, reject })),
  });
  return { elementos, pendientes };
}

test("la primera consulta muestra skeletons decorativos sin datos inventados", async () => {
  const { elementos, pendientes } = crearPagina();
  const tabla = elementos.get("#tabla-servidores");
  const estadisticas = elementos.get("#estadisticas");
  assert.equal(tabla.children.length, 3);
  assert.equal(estadisticas.children.length, 3);
  assert.equal(tabla.attributes["aria-busy"], "true");
  assert.equal(estadisticas.attributes["aria-busy"], "true");
  assert.equal(elementos.get("#total-solicitudes").classList.contains("esqueleto"), true);
  assert.equal(elementos.get("#total-servidores").classList.contains("esqueleto"), true);
  assert.equal(elementos.get("#vacio-servidores").hidden, true);
  assert.equal(elementos.get("#vacio-estadisticas").hidden, true);
  assert.equal(tabla.children.every((fila) => fila.attributes["aria-hidden"] === "true"), true);
  assert.equal(estadisticas.children.every((fila) => fila.attributes["aria-hidden"] === "true"), true);
  assert.equal(tabla.children.flatMap((fila) => fila.children).every((celda) => !celda.textContent), true);
  pendientes.shift().reject(new Error("fin de prueba"));
  await new Promise(setImmediate);
  pendientes.shift().reject(new Error("fin de prueba"));
  await new Promise(setImmediate);
});

test("los datos reales reemplazan los skeletons de cada zona al llegar", async () => {
  const { elementos, pendientes } = crearPagina();
  pendientes.shift().resolve({
    ok: true,
    json: async () => ({
      total_servidores: 1,
      servidores: [{ nombre: "Servidor 1", puerto: 8001, estado: "Activo" }],
    }),
  });
  await new Promise(setImmediate);
  const tabla = elementos.get("#tabla-servidores");
  assert.equal(tabla.children.length, 1);
  assert.equal(tabla.children[0].children[0].textContent, "Servidor 1");
  assert.equal(tabla.attributes["aria-busy"], "false");
  assert.equal(elementos.get("#total-servidores").classList.contains("esqueleto"), false);
  assert.equal(elementos.get("#estadisticas").children.length, 3);

  pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_solicitudes: 2, Solicitudes_por_servidor: { "Servidor 1": 2 } }),
  });
  await new Promise(setImmediate);
  const reparto = elementos.get("#estadisticas");
  assert.equal(reparto.children.length, 1);
  assert.equal(reparto.children[0].children[2].textContent, 2);
  assert.equal(reparto.attributes["aria-busy"], "false");
  assert.equal(elementos.get("#total-solicitudes").classList.contains("esqueleto"), false);
});

test("una API caída muestra vacíos y permite reintentar sin skeleton persistente", async () => {
  const { elementos, pendientes } = crearPagina();
  pendientes.shift().reject(new Error("sin red"));
  await new Promise(setImmediate);
  pendientes.shift().reject(new Error("sin red"));
  await new Promise(setImmediate);

  assert.equal(elementos.get("#tabla-servidores").children.length, 0);
  assert.equal(elementos.get("#estadisticas").children.length, 0);
  assert.equal(elementos.get("#vacio-servidores").hidden, false);
  assert.equal(elementos.get("#vacio-estadisticas").hidden, false);
  assert.equal(elementos.get("#tabla-servidores").attributes["aria-busy"], "false");
  assert.equal(elementos.get("#estadisticas").attributes["aria-busy"], "false");
  assert.equal(elementos.get("#total-solicitudes").classList.contains("esqueleto"), false);
  assert.equal(elementos.get("#total-servidores").classList.contains("esqueleto"), false);

  const reintento = elementos.get("#actualizar").click();
  assert.equal(elementos.get("#tabla-servidores").children.length, 0);
  pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_servidores: 0, servidores: [] }),
  });
  await new Promise(setImmediate);
  pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_solicitudes: 0, Solicitudes_por_servidor: {} }),
  });
  await reintento;
  assert.equal(elementos.get("#tabla-servidores").children.length, 0);
  assert.equal(elementos.get("#total-solicitudes").textContent, 0);
});
