const API_BASE = "http://127.0.0.1:8000";

const estado = {
  servidores: null,
  estadisticas: null,
  ocupado: false,
  tema: null,
  temporizadorPulso: null,
  animaciones: new Map(),
  repartoAnterior: null,
  vistaPrevia: location.protocol === "https:" && API_BASE.startsWith("http:"),
};

const elementos = {
  ambiente: document.querySelector("#ambiente"),
  tema: document.querySelector("#tema"),
  temaEtiqueta: document.querySelector("#tema-etiqueta"),
  temaIcono: document.querySelector("#tema-icono"),
  aviso: document.querySelector("#aviso"),
  totalSolicitudes: document.querySelector("#total-solicitudes"),
  totalServidores: document.querySelector("#total-servidores"),
  tabla: document.querySelector("#tabla-servidores"),
  vacioServidores: document.querySelector("#vacio-servidores"),
  estadisticas: document.querySelector("#estadisticas"),
  vacioEstadisticas: document.querySelector("#vacio-estadisticas"),
  resultado: document.querySelector("#resultado"),
  eventos: document.querySelector("#eventos"),
  actualizar: document.querySelector("#actualizar"),
  solicitar: document.querySelector("#solicitar"),
};

const temaSistema = matchMedia("(prefers-color-scheme: dark)");
const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)");

function mostrarTema() {
  const oscuro = estado.tema ? estado.tema === "oscuro" : temaSistema.matches;
  const siguiente = oscuro ? "claro" : "oscuro";
  elementos.temaEtiqueta.textContent = `Modo ${siguiente}`;
  elementos.temaIcono.textContent = oscuro ? "☀" : "☾";
  elementos.tema.setAttribute("aria-label", `Modo ${siguiente}: activar`);
}

function restaurarTema() {
  try {
    const guardado = localStorage.getItem("aetherroute-tema");
    if (guardado === "claro" || guardado === "oscuro") {
      estado.tema = guardado;
      document.documentElement.dataset.tema = guardado;
    }
  } catch {
    // El sistema sigue determinando el tema si el almacenamiento está bloqueado.
  }
  mostrarTema();
}

function cambiarTema() {
  const oscuro = estado.tema ? estado.tema === "oscuro" : temaSistema.matches;
  estado.tema = oscuro ? "claro" : "oscuro";
  document.documentElement.dataset.tema = estado.tema;
  try {
    localStorage.setItem("aetherroute-tema", estado.tema);
  } catch {
    // El tema de esta sesión sigue funcionando sin almacenamiento.
  }
  mostrarTema();
}

function pulsoAmbiental(tipo) {
  elementos.ambiente.dataset.evento = tipo;
  clearTimeout(estado.temporizadorPulso);
  estado.temporizadorPulso = setTimeout(() => {
    delete elementos.ambiente.dataset.evento;
  }, 800);
}

async function api(ruta) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 3000);
  try {
    const respuesta = await fetch(`${API_BASE}${ruta}`, { signal: controlador.signal });
    if (!respuesta.ok) {
      throw new Error(
        respuesta.status === 503
          ? "No hay servidores disponibles."
          : `La petición falló (HTTP ${respuesta.status}).`,
      );
    }
    return await respuesta.json();
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError) {
      throw new Error("La API no responde. Verifica que el balanceador esté en ejecución.");
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

function evento(mensaje, tipo = "info") {
  if (tipo === "error" && !estado.vistaPrevia) pulsoAmbiental("error");
  const entrada = document.createElement("li");
  entrada.textContent = `[${new Date().toLocaleTimeString("es-CO")}] ${mensaje}`;
  if (tipo === "error") entrada.classList.add("error");
  elementos.eventos.prepend(entrada);
  if (elementos.eventos.childElementCount > 20) {
    elementos.eventos.lastElementChild.remove();
  }
}

function ocupar(valor) {
  estado.ocupado = valor;
  elementos.actualizar.disabled = valor || estado.vistaPrevia;
  elementos.solicitar.disabled = valor || estado.vistaPrevia;
}

function mostrarEsqueletos() {
  for (const metrica of [elementos.totalSolicitudes, elementos.totalServidores]) {
    metrica.classList.add("esqueleto");
    metrica.setAttribute("aria-busy", "true");
  }
  elementos.tabla.setAttribute("aria-busy", "true");
  elementos.estadisticas.setAttribute("aria-busy", "true");
  elementos.vacioServidores.hidden = true;
  elementos.vacioEstadisticas.hidden = true;

  for (let indice = 0; indice < 3; indice += 1) {
    const fila = document.createElement("tr");
    fila.setAttribute("aria-hidden", "true");
    for (let columna = 0; columna < 3; columna += 1) {
      const celda = document.createElement("td");
      const forma = document.createElement("span");
      forma.className = "esqueleto esqueleto--texto";
      celda.append(forma);
      fila.append(celda);
    }
    elementos.tabla.append(fila);

    const barra = document.createElement("div");
    barra.className = "estadistica";
    barra.setAttribute("aria-hidden", "true");
    for (const clase of ["esqueleto--texto", "esqueleto--barra", "esqueleto--cifra"]) {
      const forma = document.createElement("span");
      forma.className = `esqueleto ${clase}`;
      barra.append(forma);
    }
    elementos.estadisticas.append(barra);
  }
}

function finalizarAnimaciones() {
  for (const [nodo, animacion] of estado.animaciones) {
    cancelAnimationFrame(animacion.id);
    nodo.textContent = animacion.valor;
  }
  estado.animaciones.clear();
}

function animarNumero(nodo, valor, etiqueta) {
  const pendiente = estado.animaciones.get(nodo);
  if (pendiente) {
    cancelAnimationFrame(pendiente.id);
    estado.animaciones.delete(nodo);
  }
  nodo.setAttribute("aria-label", valor == null ? etiqueta : `${etiqueta}: ${valor}`);
  const anterior = nodo.textContent;
  if (valor == null || anterior === "" || movimientoReducido.matches || document.visibilityState === "hidden") {
    nodo.textContent = valor ?? "";
    return;
  }
  const inicio = Number(anterior);
  if (inicio === valor) return;
  const comienzo = performance.now();
  const animacion = { id: null, valor };
  estado.animaciones.set(nodo, animacion);
  function avanzar(tiempo) {
    if (estado.animaciones.get(nodo) !== animacion) return;
    const progreso = Math.min(1, (tiempo - comienzo) / 450);
    nodo.textContent = Math.round(inicio + (valor - inicio) * (1 - (1 - progreso) ** 3));
    if (progreso < 1) animacion.id = requestAnimationFrame(avanzar);
    else estado.animaciones.delete(nodo);
  }
  animacion.id = requestAnimationFrame(avanzar);
}

function pintarServidores() {
  elementos.tabla.replaceChildren();
  elementos.tabla.setAttribute("aria-busy", "false");
  elementos.totalServidores.classList.remove("esqueleto");
  elementos.totalServidores.setAttribute("aria-busy", "false");
  const lista = estado.servidores?.servidores;
  const activos = lista?.filter((servidor) => servidor.estado === "Activo").length;
  document.documentElement.dataset.red = !lista?.length
    ? "desconocida"
    : activos === lista.length ? "estable" : activos ? "parcial" : "caida";
  animarNumero(elementos.totalServidores, estado.servidores?.total_servidores, "Servidores configurados");
  elementos.vacioServidores.hidden = Boolean(lista?.length);
  if (!lista) return;

  for (const servidor of lista) {
    const fila = document.createElement("tr");
    for (const valor of [servidor.nombre, servidor.puerto]) {
      const celda = document.createElement("td");
      celda.textContent = valor;
      fila.append(celda);
    }
    const disponibilidad = document.createElement("td");
    disponibilidad.textContent = servidor.estado;
    disponibilidad.className = servidor.estado === "Activo" ? "estado--activo" : "estado--inactivo";
    fila.append(disponibilidad);
    elementos.tabla.append(fila);
  }
}

function pintarEstadisticas() {
  elementos.estadisticas.replaceChildren();
  elementos.estadisticas.setAttribute("aria-busy", "false");
  elementos.totalSolicitudes.classList.remove("esqueleto");
  elementos.totalSolicitudes.setAttribute("aria-busy", "false");
  animarNumero(elementos.totalSolicitudes, estado.estadisticas?.total_solicitudes, "Solicitudes atendidas");
  const lista = estado.servidores?.servidores;
  elementos.vacioEstadisticas.hidden = Boolean(estado.estadisticas && lista?.length);
  if (!estado.estadisticas || !lista) {
    estado.repartoAnterior = null;
    return;
  }

  const reparto = new Map();
  for (const servidor of lista) {
    const cantidad = estado.estadisticas.Solicitudes_por_servidor[servidor.nombre] ?? 0;
    const fila = document.createElement("div");
    fila.className = "estadistica";
    const nombre = document.createElement("span");
    nombre.textContent = servidor.nombre;
    const barra = document.createElement("div");
    barra.className = "barra";
    const progreso = document.createElement("progress");
    progreso.max = Math.max(1, estado.estadisticas.total_solicitudes);
    progreso.value = cantidad;
    progreso.setAttribute("aria-label", `${servidor.nombre}: ${cantidad} solicitudes`);
    const trazo = document.createElement("span");
    trazo.className = "barra__trazo";
    trazo.setAttribute("aria-hidden", "true");
    const fraccion = cantidad / progreso.max;
    const anterior = estado.repartoAnterior?.get(servidor.nombre);
    const animar = anterior != null && anterior !== fraccion && !movimientoReducido.matches
      && document.visibilityState !== "hidden";
    trazo.style.transform = `scaleX(${animar ? anterior : fraccion})`;
    barra.append(progreso, trazo);
    const total = document.createElement("span");
    total.textContent = cantidad;
    fila.append(nombre, barra, total);
    elementos.estadisticas.append(fila);
    if (animar) requestAnimationFrame(() => requestAnimationFrame(() => {
      trazo.style.transform = `scaleX(${fraccion})`;
    }));
    reparto.set(servidor.nombre, fraccion);
  }
  estado.repartoAnterior = reparto;
}

async function refrescar() {
  try {
    estado.servidores = await api("/servidores");
    pintarServidores();
  } catch (error) {
    estado.servidores = null;
    pintarServidores();
    evento(error.message, "error");
  }

  try {
    estado.estadisticas = await api("/estadisticas");
    pintarEstadisticas();
  } catch {
    estado.estadisticas = null;
    pintarEstadisticas();
    evento("No se pudieron cargar las estadísticas.", "error");
  }
}

async function actualizar() {
  if (estado.ocupado) return;
  ocupar(true);
  try {
    await refrescar();
  } finally {
    ocupar(false);
  }
}

async function solicitar() {
  if (estado.ocupado) return;
  ocupar(true);
  try {
    const datos = await api("/solicitar");
    elementos.resultado.classList.remove("error");
    elementos.resultado.textContent = `${datos.servidor} · petición ${datos.contador} · ${datos.resultado}`;
    evento(`${datos.servidor} atendió la solicitud.`);
    pulsoAmbiental("solicitud");
    await refrescar();
  } catch (error) {
    elementos.resultado.classList.add("error");
    elementos.resultado.textContent = error.message;
    evento(error.message, "error");
  } finally {
    ocupar(false);
  }
}

function iniciar() {
  document.documentElement.dataset.red = "desconocida";
  restaurarTema();
  elementos.tema.addEventListener("click", cambiarTema);
  temaSistema.addEventListener("change", () => {
    if (!estado.tema) mostrarTema();
  });
  elementos.actualizar.addEventListener("click", actualizar);
  elementos.solicitar.addEventListener("click", solicitar);
  if (estado.vistaPrevia) {
    elementos.aviso.hidden = false;
    elementos.aviso.textContent = "Vista previa: para consultar la red desde Hosting se necesita una API HTTPS. Usa la demo local para probar las solicitudes.";
    ocupar(false);
    pintarServidores();
    pintarEstadisticas();
    return;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      elementos.ambiente.dataset.pausado = "true";
      finalizarAnimaciones();
    } else {
      delete elementos.ambiente.dataset.pausado;
    }
  });
  movimientoReducido.addEventListener("change", () => {
    if (movimientoReducido.matches) finalizarAnimaciones();
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    elementos.ambiente.classList.add("ambiente--listo");
  }));
  mostrarEsqueletos();
  actualizar();
}

iniciar();
