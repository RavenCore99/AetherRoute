const API_BASE = "http://127.0.0.1:8000";

const estado = {
  servidores: null,
  estadisticas: null,
  ocupado: false,
  tema: null,
  vistaPrevia: location.protocol === "https:" && API_BASE.startsWith("http:"),
};

const elementos = {
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

function mostrarTema() {
  const oscuro = estado.tema ? estado.tema === "oscuro" : temaSistema.matches;
  const siguiente = oscuro ? "claro" : "oscuro";
  elementos.temaEtiqueta.textContent = `Modo ${siguiente}`;
  elementos.temaIcono.textContent = oscuro ? "☀" : "☾";
  elementos.tema.setAttribute("aria-label", `Cambiar a tema ${siguiente}`);
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

function pintarServidores() {
  elementos.tabla.replaceChildren();
  const lista = estado.servidores?.servidores;
  elementos.totalServidores.textContent = estado.servidores?.total_servidores ?? "";
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
  elementos.totalSolicitudes.textContent = estado.estadisticas?.total_solicitudes ?? "";
  const lista = estado.servidores?.servidores;
  elementos.vacioEstadisticas.hidden = Boolean(estado.estadisticas && lista?.length);
  if (!estado.estadisticas || !lista) return;

  for (const servidor of lista) {
    const cantidad = estado.estadisticas.Solicitudes_por_servidor[servidor.nombre] ?? 0;
    const fila = document.createElement("div");
    fila.className = "estadistica";
    const nombre = document.createElement("span");
    nombre.textContent = servidor.nombre;
    const barra = document.createElement("progress");
    barra.max = Math.max(1, estado.estadisticas.total_solicitudes);
    barra.value = cantidad;
    barra.setAttribute("aria-label", `${servidor.nombre}: ${cantidad} solicitudes`);
    const total = document.createElement("span");
    total.textContent = cantidad;
    fila.append(nombre, barra, total);
    elementos.estadisticas.append(fila);
  }
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
  actualizar();
}

iniciar();
