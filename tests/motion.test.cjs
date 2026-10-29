const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/script.js"), "utf8");

function crearPagina({ reducido = false, visible = true } = {}) {
  const elementos = new Map();
  const pendientes = [];
  const fotogramas = [];
  const eventos = new Map();
  const movimiento = {
    matches: reducido,
    addEventListener(_nombre, callback) { this.alCambiar = callback; },
  };
  let ahora = 0;
  function nodo(etiqueta = "div") {
    const clases = new Set();
    return {
      etiqueta,
      children: [],
      dataset: {},
      attributes: {},
      style: {},
      hidden: true,
      get textContent() { return this._texto ?? ""; },
      set textContent(valor) { this._texto = String(valor); },
      classList: {
        add: (clase) => clases.add(clase),
        remove: (clase) => clases.delete(clase),
        contains: (clase) => clases.has(clase),
      },
      setAttribute(nombre, valor) { this.attributes[nombre] = valor; },
      addEventListener(nombre, callback) { this.eventos ??= {}; this.eventos[nombre] = callback; },
      click() { return this.eventos.click(); },
      append(...hijos) { this.children.push(...hijos); },
      prepend(hijo) { this.children.unshift(hijo); },
      replaceChildren(...hijos) { this.children = hijos; },
      remove() {},
      get childElementCount() { return this.children.length; },
      get lastElementChild() { return this.children.at(-1); },
    };
  }
  const documento = {
    documentElement: nodo(),
    visibilityState: visible ? "visible" : "hidden",
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
    matchMedia: (query) => query.includes("reduced-motion") ? movimiento : { matches: false, addEventListener() {} },
    fetch: (url) => new Promise((resolve, reject) => pendientes.push({ url, resolve, reject })),
    requestAnimationFrame: (callback) => { fotogramas.push(callback); return fotogramas.length; },
    cancelAnimationFrame() {},
    performance: { now: () => ahora },
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return {
    documento, elementos, pendientes, fotogramas, eventos, movimiento,
    paso(tiempo) {
      ahora = tiempo;
      for (const callback of fotogramas.splice(0)) callback(tiempo);
    },
  };
}

const servidores = [{ nombre: "Servidor 1", puerto: 8001, estado: "Activo" }];

async function responder(pagina, total) {
  pagina.pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_servidores: 1, servidores }),
  });
  await new Promise(setImmediate);
  pagina.pendientes.shift().resolve({
    ok: true,
    json: async () => ({ total_solicitudes: total, Solicitudes_por_servidor: { "Servidor 1": total } }),
  });
  await new Promise(setImmediate);
}

test("el primer dato es exacto y solo una actualización posterior anima el contador", async () => {
  const pagina = crearPagina();
  pagina.paso(0);
  pagina.paso(16);
  await responder(pagina, 0);
  const total = pagina.elementos.get("#total-solicitudes");
  assert.equal(total.textContent, "0");
  const actualizacion = pagina.elementos.get("#actualizar").click();
  await responder(pagina, 3);
  await actualizacion;
  assert.equal(total.textContent, "0");
  assert.equal(total.attributes["aria-label"], "Solicitudes atendidas: 3");
  pagina.paso(100);
  pagina.paso(300);
  assert.notEqual(total.textContent, "0");
  pagina.paso(700);
  assert.equal(total.textContent, "3");
});

test("las barras conservan el valor semántico final mientras transiciona su trazo", async () => {
  const pagina = crearPagina();
  pagina.paso(0);
  pagina.paso(16);
  await responder(pagina, 0);
  const actualizacion = pagina.elementos.get("#actualizar").click();
  await responder(pagina, 3);
  await actualizacion;
  const barra = pagina.elementos.get("#estadisticas").children[0].children[1];
  assert.equal(barra.children[0].etiqueta, "progress");
  assert.equal(barra.children[0].value, 3);
  assert.equal(barra.children[0].attributes["aria-label"], "Servidor 1: 3 solicitudes");
  assert.equal(barra.children[1].style.transform, "scaleX(0)");
  pagina.paso(800);
  pagina.paso(816);
  assert.equal(barra.children[1].style.transform, "scaleX(1)");
});

test("movimiento reducido o pestaña oculta muestran el dato final sin animación", async () => {
  for (const opciones of [{ reducido: true }, { visible: false }]) {
    const pagina = crearPagina(opciones);
    await responder(pagina, 0);
    const actualizacion = pagina.elementos.get("#actualizar").click();
    await responder(pagina, 4);
    await actualizacion;
    assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "4");
    const barra = pagina.elementos.get("#estadisticas").children[0].children[1];
    assert.equal(barra.children[0].value, 4);
    assert.equal(barra.children[1].style.transform, "scaleX(1)");
  }
});

test("al ocultar la pestaña termina cualquier contador en curso", async () => {
  const pagina = crearPagina();
  await responder(pagina, 0);
  const actualizacion = pagina.elementos.get("#actualizar").click();
  await responder(pagina, 6);
  await actualizacion;
  assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "0");
  pagina.documento.visibilityState = "hidden";
  pagina.eventos.get("visibilitychange")();
  assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "6");
  pagina.paso(700);
  assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "6");
});

test("activar movimiento reducido o recibir otra respuesta cancela el conteo anterior", async () => {
  const pagina = crearPagina();
  await responder(pagina, 0);
  const primera = pagina.elementos.get("#actualizar").click();
  await responder(pagina, 6);
  await primera;
  pagina.paso(100);
  const segunda = pagina.elementos.get("#actualizar").click();
  await responder(pagina, 8);
  await segunda;
  assert.equal(pagina.elementos.get("#total-solicitudes").attributes["aria-label"], "Solicitudes atendidas: 8");
  pagina.movimiento.matches = true;
  pagina.movimiento.alCambiar();
  assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "8");
  pagina.paso(900);
  assert.equal(pagina.elementos.get("#total-solicitudes").textContent, "8");
});
