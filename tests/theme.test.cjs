const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../web/script.js"), "utf8");

function crearPagina({ oscuro = false, guardado = null, storageFalla = false } = {}) {
  const elementos = new Map();
  const valores = new Map(guardado === null ? [] : [["aetherroute-tema", guardado]]);
  const sistema = {
    matches: oscuro,
    addEventListener(_evento, callback) { this.alCambiar = callback; },
  };
  const documento = {
    documentElement: {
      dataset: {},
      removeAttribute(nombre) {
        if (nombre === "data-tema") delete this.dataset.tema;
      },
    },
    querySelector(selector) {
      if (!elementos.has(selector)) {
        elementos.set(selector, {
          textContent: "",
          hidden: true,
          classList: { remove() {} },
          replaceChildren() {},
          setAttribute(nombre, valor) { this[nombre] = valor; },
          addEventListener(_evento, callback) { this.alClic = callback; },
          click() { this.alClic(); },
        });
      }
      return elementos.get(selector);
    },
  };
  const almacenamiento = {
    getItem(clave) {
      if (storageFalla) throw new Error("Storage bloqueado");
      return valores.get(clave) ?? null;
    },
    setItem(clave, valor) {
      if (storageFalla) throw new Error("Storage bloqueado");
      valores.set(clave, valor);
    },
  };
  vm.runInNewContext(script, {
    document: documento,
    location: { protocol: "https:" },
    localStorage: almacenamiento,
    matchMedia: () => sistema,
  });
  return { documento, elementos, valores, sistema };
}

test("sin preferencia guardada, el control ofrece el tema opuesto al sistema", () => {
  const pagina = crearPagina({ oscuro: false });
  assert.equal(pagina.documento.documentElement.dataset.tema, undefined);
  assert.equal(pagina.elementos.get("#tema-etiqueta")?.textContent, "Modo oscuro");
  assert.equal(pagina.elementos.get("#tema")?.["aria-label"], "Cambiar a tema oscuro");
});

test("cada clic alterna el tema y guarda la elección explícita", () => {
  const pagina = crearPagina({ oscuro: false });
  pagina.elementos.get("#tema").click();
  assert.equal(pagina.documento.documentElement.dataset.tema, "oscuro");
  assert.equal(pagina.valores.get("aetherroute-tema"), "oscuro");
  assert.equal(pagina.elementos.get("#tema-etiqueta").textContent, "Modo claro");
  pagina.elementos.get("#tema").click();
  assert.equal(pagina.documento.documentElement.dataset.tema, "claro");
  assert.equal(pagina.valores.get("aetherroute-tema"), "claro");
});

test("al recargar, una preferencia guardada prevalece sobre el sistema", () => {
  const pagina = crearPagina({ oscuro: false, guardado: "oscuro" });
  assert.equal(pagina.documento.documentElement.dataset.tema, "oscuro");
  assert.equal(pagina.elementos.get("#tema-etiqueta").textContent, "Modo claro");
});

test("sigue cambios del sistema solo cuando no hay preferencia explícita", () => {
  const pagina = crearPagina({ oscuro: false });
  pagina.sistema.matches = true;
  pagina.sistema.alCambiar();
  assert.equal(pagina.elementos.get("#tema-etiqueta").textContent, "Modo claro");
  pagina.elementos.get("#tema").click();
  pagina.sistema.matches = false;
  pagina.sistema.alCambiar();
  assert.equal(pagina.documento.documentElement.dataset.tema, "claro");
  assert.equal(pagina.elementos.get("#tema-etiqueta").textContent, "Modo oscuro");
});
