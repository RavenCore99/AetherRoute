const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/script.js"), "utf8");

function crearPagina() {
  const elementos = new Map();
  const pendientes = [];
  const fotogramas = [];
  const eventos = new Map();
  function nodo() {
    const clases = new Set();
    return {
      children: [],
      dataset: {},
      style: {},
      attributes: {},
      hidden: true,
      textContent: "",
      classList: {
        add: (nombre) => clases.add(nombre),
        remove: (nombre) => clases.delete(nombre),
        contains: (nombre) => clases.has(nombre),
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
    documentElement: nodo(),
    visibilityState: "visible",
    createElement: nodo,
    addEventListener(nombre, callback) { eventos.set(nombre, callback); },
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
    fetch: (url) => new Promise((resolve, reject) => pendientes.push({ url, resolve, reject })),
    requestAnimationFrame: (callback) => fotogramas.push(callback),
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return { documento, elementos, pendientes, fotogramas, eventos };
}

async function responder(pagina, servidores) {
  pagina.pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_servidores: 3, servidores }),
  });
  await new Promise(setImmediate);
  pagina.pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_solicitudes: 0, Solicitudes_por_servidor: {} }),
  });
  await new Promise(setImmediate);
}

const servidores = [1, 2, 3].map((numero) => ({
  nombre: `Servidor ${numero}`,
  puerto: 8000 + numero,
  estado: "Activo",
}));

test("la luz espera datos y refleja una red completamente activa", async () => {
  const pagina = crearPagina();
  assert.equal(pagina.documento.documentElement.dataset.red, "desconocida");
  await responder(pagina, servidores);
  assert.equal(pagina.documento.documentElement.dataset.red, "estable");
});

test("la luz distingue un servidor inactivo de la caída de todos", async () => {
  const parcial = crearPagina();
  await responder(parcial, servidores.map((servidor, indice) => ({
    ...servidor,
    estado: indice === 1 ? "Inactivo" : "Activo",
  })));
  assert.equal(parcial.documento.documentElement.dataset.red, "parcial");

  const caida = crearPagina();
  await responder(caida, servidores.map((servidor) => ({ ...servidor, estado: "Inactivo" })));
  assert.equal(caida.documento.documentElement.dataset.red, "caida");
});

test("una consulta fallida no se confunde con todos los servidores caídos", async () => {
  const pagina = crearPagina();
  await responder(pagina, servidores);
  const reintento = pagina.elementos.get("#actualizar").click();
  pagina.pendientes.shift().reject(new Error("API fuera de línea"));
  await new Promise(setImmediate);
  pagina.pendientes.shift().reject(new Error("API fuera de línea"));
  await reintento;
  assert.equal(pagina.documento.documentElement.dataset.red, "desconocida");
  assert.equal(pagina.elementos.get("#vacio-servidores").hidden, false);
});

test("la decoración inicia tras la primera pintura y se pausa al ocultar la pestaña", async () => {
  const pagina = crearPagina();
  const ambiente = pagina.documento.querySelector("#ambiente");
  assert.equal(ambiente.classList.contains("ambiente--listo"), false);
  assert.equal(pagina.fotogramas.length, 1);
  pagina.fotogramas.shift()();
  assert.equal(ambiente.classList.contains("ambiente--listo"), false);
  pagina.fotogramas.shift()();
  assert.equal(ambiente.classList.contains("ambiente--listo"), true);

  pagina.documento.visibilityState = "hidden";
  pagina.eventos.get("visibilitychange")();
  assert.equal(ambiente.dataset.pausado, "true");
  pagina.documento.visibilityState = "visible";
  pagina.eventos.get("visibilitychange")();
  assert.equal(ambiente.dataset.pausado, undefined);

  await responder(pagina, servidores);
});

test("una solicitud atendida produce un pulso breve sin alterar los datos", async () => {
  const pagina = crearPagina();
  await responder(pagina, servidores);
  const envio = pagina.elementos.get("#solicitar").click();
  pagina.pendientes.shift().resolve({
    ok: true,
    json: async () => ({
      servidor: "Servidor 1",
      puerto: 8001,
      contador: 1,
      resultado: "Solicitudes procesadas correctamente",
    }),
  });
  await new Promise(setImmediate);
  assert.equal(pagina.elementos.get("#ambiente").dataset.evento, "solicitud");
  await responder(pagina, servidores);
  await envio;
  assert.match(pagina.elementos.get("#resultado").textContent, /Servidor 1/);
  await new Promise((resolve) => setTimeout(resolve, 900));
  assert.equal(pagina.elementos.get("#ambiente").dataset.evento, undefined);
});

test("una solicitud fallida activa el pulso de error sin fingir éxito", async () => {
  const pagina = crearPagina();
  await responder(pagina, servidores);
  const envio = pagina.elementos.get("#solicitar").click();
  pagina.pendientes.shift().reject(new Error("No hay servidores disponibles."));
  await envio;
  assert.equal(pagina.elementos.get("#ambiente").dataset.evento, "error");
  assert.equal(pagina.elementos.get("#resultado").textContent, "No hay servidores disponibles.");
  assert.equal(pagina.elementos.get("#resultado").classList.contains("error"), true);
});
