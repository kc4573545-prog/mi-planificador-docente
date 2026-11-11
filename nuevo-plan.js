(async function () {
  const { api, esc, toast, cls } = MPD;
  const $ = (id) => document.getElementById(id);
  const perfil = await MPD.init(); if (!perfil) return;
  const cat = await api('/catalogo');
  let planId = new URLSearchParams(location.search).get('id');
  let soloLectura = false;
  const MOMENTOS = ['Inicio', 'Desarrollo', 'Cierre'];

  const activas = perfil.areas.filter((a) => a.activa);
  const listaAreas = activas.length ? activas : perfil.areas;
  $('area').innerHTML = listaAreas.map((a) => `<option>${esc(a.nombre)}</option>`).join('');
  $('nivel').innerHTML = cat.niveles.map((n) => `<option>${esc(n)}</option>`).join('');
  $('grado').innerHTML = cat.grados.map((n) => `<option>${esc(n)}</option>`).join('');
  $('periodo').innerHTML = '<option value="">—</option>' + cat.periodos.map((n) => `<option>${esc(n)}</option>`).join('');
  $('secciones-dl').innerHTML = [...new Set(perfil.secciones.map((s) => s.seccion))].map((s) => `<option value="${esc(s)}">`).join('');
  $('comps').innerHTML = cat.competencias.map((c) => `<label class="flex items-center gap-2 text-body-md"><input type="checkbox" class="accent-[#0f4c81] h-4 w-4" value="${esc(c.nombre)}">${esc(c.nombre)}</label>`).join('');
  $('secuencia').innerHTML = MOMENTOS.map((m, i) => `<div class="${cls.card} space-y-2" data-i="${i}">
      <div class="flex items-center justify-between"><span class="text-title-sm text-primary">Momento de ${m}</span>
        <label class="flex items-center gap-1 text-label-md text-on-surface-variant"><input type="number" min="0" max="600" data-f="minutos" class="${cls.input} !w-20 !py-1"> min</label></div>
      <textarea data-f="ensenanza" rows="2" class="${cls.input}" placeholder="Actividades de enseñanza (docente)"></textarea>
      <textarea data-f="aprendizaje" rows="2" class="${cls.input}" placeholder="Actividades de aprendizaje (estudiantes)"></textarea>
      <textarea data-f="recursos" rows="1" class="${cls.input}" placeholder="Recursos didácticos"></textarea></div>`).join('');

  function indicador(texto = '', codigo = '') {
    const d = document.createElement('div');
    d.className = 'flex gap-2 items-start';
    d.innerHTML = `<textarea rows="2" data-f="texto" class="${cls.input}" placeholder="Indicador de logro">${esc(texto)}</textarea>
      <input data-f="codigo" class="${cls.input} !w-24" placeholder="Código" value="${esc(codigo)}">
      <button type="button" class="p-2 text-error" aria-label="Quitar"><span class="${cls.icon}">close</span></button>`;
    d.querySelector('button').onclick = () => d.remove();
    $('indicadores').appendChild(d);
  }
  $('add-ind').onclick = () => indicador();

  function repartir() { // formato estándar: 15 % / 70 % / 15 %
    if (!perfil.ajustes.formato_estandar) return;
    const t = +$('duracion').value; if (!t) return;
    const a = Math.round(t * 0.15), c = Math.round(t * 0.15);
    [a, t - a - c, c].forEach((v, i) => { document.querySelector(`#secuencia [data-i="${i}"] [data-f="minutos"]`).value = v; });
  }
  $('duracion').onchange = repartir;

  function llenar(p) {
    const d = p.datos || {};
    $('titulo').value = p.titulo; $('area').value = p.area;
    if (![...$('area').options].some((o) => o.value === p.area)) $('area').insertAdjacentHTML('beforeend', `<option>${esc(p.area)}</option>`), $('area').value = p.area;
    if (p.nivel) $('nivel').value = p.nivel; if (p.grado) $('grado').value = p.grado;
    $('seccion').value = p.seccion || ''; $('periodo').value = p.periodo || '';
    $('fecha').value = (p.fecha_aplicacion || '').slice(0, 10); $('duracion').value = p.duracion_min || '';
    $('eje').value = d.eje_transversal || ''; $('resumen').value = d.resumen || '';
    $('comp-esp').value = d.competencia_especifica || '';
    document.querySelectorAll('#comps input').forEach((i) => { i.checked = (d.competencias_fundamentales || []).includes(i.value); });
    $('indicadores').innerHTML = ''; (d.indicadores || []).forEach((i) => indicador(i.texto, i.codigo));
    const c = d.contenidos || {};
    $('c-conc').value = c.conceptuales || ''; $('c-proc').value = c.procedimentales || ''; $('c-act').value = c.actitudinales || '';
    (d.secuencia || []).forEach((s, i) => {
      const box = document.querySelector(`#secuencia [data-i="${i}"]`); if (!box) return;
      box.querySelector('[data-f="minutos"]').value = s.minutos; ['ensenanza', 'aprendizaje', 'recursos'].forEach((k) => { box.querySelector(`[data-f="${k}"]`).value = s[k] || ''; });
    });
    $('recursos').value = d.recursos || ''; $('evaluacion').value = (d.evaluacion || []).join('\n');
  }

  function recoger(estado) {
    const num = (v) => (v === '' ? null : +v);
    const secuencia = MOMENTOS.map((m, i) => {
      const b = document.querySelector(`#secuencia [data-i="${i}"]`);
      const g = (k) => b.querySelector(`[data-f="${k}"]`).value.trim();
      return { momento: m, minutos: +g('minutos') || 0, ensenanza: g('ensenanza'), aprendizaje: g('aprendizaje'), recursos: g('recursos') };
    });
    return {
      titulo: $('titulo').value.trim(), area: $('area').value, nivel: $('nivel').value, grado: $('grado').value,
      seccion: $('seccion').value.trim() || null, periodo: $('periodo').value || null,
      fecha_aplicacion: $('fecha').value || null, duracion_min: num($('duracion').value), estado,
      datos: {
        resumen: $('resumen').value.trim(), eje_transversal: $('eje').value.trim(), competencia_especifica: $('comp-esp').value.trim(),
        competencias_fundamentales: [...document.querySelectorAll('#comps input:checked')].map((i) => i.value),
        indicadores: [...document.querySelectorAll('#indicadores > div')].map((d) => ({ texto: d.querySelector('[data-f="texto"]').value.trim(), codigo: d.querySelector('[data-f="codigo"]').value.trim() })).filter((i) => i.texto),
        contenidos: { conceptuales: $('c-conc').value.trim(), procedimentales: $('c-proc').value.trim(), actitudinales: $('c-act').value.trim() },
        secuencia, recursos: $('recursos').value.trim(),
        evaluacion: $('evaluacion').value.split('\n').map((l) => l.trim()).filter(Boolean),
      },
    };
  }

  async function guardar(estado) {
    if (soloLectura) return toast('Este plan es de solo lectura. Duplícalo desde la Biblioteca para editarlo.', true);
    const body = recoger(estado);
    if (body.titulo.length < 3) return toast('Escribe el tema o título de la clase', true);
    if (estado === 'completo' && !body.datos.indicadores.length) return toast('Para marcarlo completo, agrega al menos un indicador de logro', true);
    document.querySelectorAll('[data-save]').forEach((b) => { b.disabled = true; });
    try {
      const r = planId ? await api('/planes/' + planId, { method: 'PUT', body }) : await api('/planes', { method: 'POST', body });
      planId = r.id; history.replaceState(null, '', '?id=' + planId);
      if (estado === 'completo') location.href = 'imprimir.html?id=' + planId;
      else toast('Borrador guardado');
    } catch (e) { toast(e.message, true); }
    document.querySelectorAll('[data-save]').forEach((b) => { b.disabled = false; });
  }
  $('guardar-borrador').onclick = () => guardar('borrador');
  $('guardar-completo').onclick = () => guardar('completo');

  if (planId) {
    try {
      const p = await api('/planes/' + planId); llenar(p);
      if (!p.propio) { soloLectura = true; $('aviso').classList.remove('hidden'); document.querySelectorAll('[data-save]').forEach((b) => { b.disabled = true; }); }
    } catch (e) { toast(e.message, true); planId = null; }
  } else {
    if (perfil.ajustes.auto_competencias) document.querySelectorAll('#comps input').forEach((i) => { i.checked = true; });
    if (perfil.secciones[0]) { $('nivel').value = perfil.secciones[0].nivel; $('grado').value = perfil.secciones[0].grado; $('seccion').value = perfil.secciones[0].seccion; }
    $('fecha').value = new Date().toISOString().slice(0, 10);
    indicador(); repartir();
  }
})();
