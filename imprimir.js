(async function () {
  const { api, esc, toast, fecha } = MPD;
  const $ = (id) => document.getElementById(id);
  const perfil = await MPD.init(); if (!perfil) return;
  const escalas = [1, 0.85, 0.75]; let ei = 0;
  const li = (txt) => { const l = String(txt || '').split('\n').map((s) => s.trim()).filter(Boolean); return l.length ? `<ul class="list-disc pl-4 space-y-0.5">${l.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '<p class="text-outline">—</p>'; };
  const bloque = (t, body) => `<section class="mt-4"><h3 class="mb-1 border-b border-black/30 pb-0.5 text-title-sm font-bold uppercase text-primary">${t}</h3>${body}</section>`;

  function hoja(p) {
    const d = p.datos || {};
    const c = d.contenidos || {};
    const quien = p.autor_nombre || perfil.nombre;
    const ficha = [['Docente', quien], ['Centro educativo', p.autor_centro], ['Regional / Distrito', [p.autor_regional && 'Regional ' + p.autor_regional, p.autor_distrito && 'Distrito ' + p.autor_distrito].filter(Boolean).join(' · ')],
      ['Tanda', p.autor_tanda], ['Área', p.area], ['Nivel y grado', [p.nivel, p.grado, p.seccion && 'Sección ' + p.seccion].filter(Boolean).join(' · ')],
      ['Fecha', fecha(p.fecha_aplicacion)], ['Duración', p.duracion_min ? p.duracion_min + ' minutos' : ''], ['Período', p.periodo]]
      .filter(([, v]) => v).map(([k, v]) => `<div><span class="block text-label-sm uppercase text-on-surface-variant">${k}</span><span class="text-body-md font-semibold">${esc(v)}</span></div>`).join('');
    const secuencia = (d.secuencia || []).map((s) => `<div class="mb-2 break-inside-avoid rounded border border-black/20 p-2">
      <div class="flex justify-between text-title-sm font-bold"><span>${esc(s.momento)}</span><span>${s.minutos} min</span></div>
      <div class="mt-1 grid gap-2 text-body-sm sm:grid-cols-3">
        <div><b>Actividades de enseñanza</b><p>${esc(s.ensenanza) || '—'}</p></div>
        <div><b>Actividades de aprendizaje</b><p>${esc(s.aprendizaje) || '—'}</p></div>
        <div><b>Recursos didácticos</b><p>${esc(s.recursos) || '—'}</p></div></div></div>`).join('');
    const ind = (d.indicadores || []).map((i) => `<li>${esc(i.texto)}${i.codigo ? ` <span class="text-on-surface-variant">(${esc(i.codigo)})</span>` : ''}</li>`).join('');
    return `<header class="text-center">
        <p class="text-label-md uppercase tracking-wide">República Dominicana</p>
        <h1 class="text-headline-sm font-bold text-primary">Ministerio de Educación (MINERD)</h1>
        <p class="text-body-md">Planificación de clase${p.autor_centro ? ' · ' + esc(p.autor_centro) : ''}</p></header>
      ${bloque('Ficha técnica', `<div class="grid grid-cols-2 gap-x-4 gap-y-2">${ficha}</div>`)}
      ${bloque('Tema de la clase', `<p class="text-body-md font-semibold">${esc(p.titulo)}</p>`)}
      ${bloque('1. Competencias fundamentales', li((d.competencias_fundamentales || []).join('\n')))}
      ${bloque('2. Competencia específica', `<p class="text-body-md">${esc(d.competencia_especifica) || '—'}</p>${d.eje_transversal ? `<p class="mt-1 text-body-md"><b>Eje transversal:</b> ${esc(d.eje_transversal)}</p>` : ''}`)}
      ${bloque('3. Contenidos', `<div class="grid gap-3 text-body-sm sm:grid-cols-3"><div><b>Conceptuales</b>${li(c.conceptuales)}</div><div><b>Procedimentales</b>${li(c.procedimentales)}</div><div><b>Actitudinales</b>${li(c.actitudinales)}</div></div>`)}
      ${bloque('4. Secuencia didáctica', secuencia || '<p class="text-outline">—</p>')}
      ${bloque('5. Indicadores de logro y evaluación', `<ul class="list-disc pl-4 text-body-md">${ind || '<li>—</li>'}</ul><p class="mt-2 text-body-sm font-bold">Estrategias e instrumentos de evaluación</p>${li((d.evaluacion || []).join('\n'))}${d.recursos ? `<p class="mt-2 text-body-sm font-bold">Recursos y materiales</p><p class="text-body-sm">${esc(d.recursos)}</p>` : ''}`)}
      <div id="firmas" class="mt-10 grid grid-cols-2 gap-8 break-inside-avoid text-center text-body-sm">
        <div><div class="border-t border-black pt-1"><b>${esc(quien)}</b><br>Docente titular</div></div>
        <div><div class="border-t border-black pt-1"><b>&nbsp;</b><br>Coordinación pedagógica · Visto bueno</div></div></div>`;
  }

  async function mostrar(id) {
    try { const p = await api('/planes/' + id); $('hoja').innerHTML = hoja(p); $('firmas').style.display = $('firma').checked ? '' : 'none'; history.replaceState(null, '', '?id=' + id); }
    catch (e) { toast(e.message, true); }
  }

  const planes = await api('/planes');
  if (!planes.length) { $('hoja').innerHTML = '<p class="text-center text-on-surface-variant">Aún no tienes planes. <a class="font-semibold text-primary" href="nuevo-plan.html">Crea el primero</a>.</p>'; return; }
  $('selector').innerHTML = planes.map((p) => `<option value="${p.id}">${esc(p.titulo)} — ${esc(p.area)}</option>`).join('');
  const id = new URLSearchParams(location.search).get('id');
  if (id) {
    if (!planes.some((p) => p.id === id)) $('selector').insertAdjacentHTML('afterbegin', `<option value="${esc(id)}">Plan seleccionado</option>`);
    $('selector').value = id;
  }
  $('selector').onchange = () => mostrar($('selector').value);
  $('firma').onchange = () => { const f = $('firmas'); if (f) f.style.display = $('firma').checked ? '' : 'none'; };
  $('escala').onclick = () => { ei = (ei + 1) % escalas.length; $('hoja').style.zoom = escalas[ei]; $('escala-txt').textContent = Math.round(escalas[ei] * 100) + '%'; };
  $('imprimir').onclick = () => window.print();
  mostrar($('selector').value);
})();
