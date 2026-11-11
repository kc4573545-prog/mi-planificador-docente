(async function () {
  const { api, esc, toast, cls } = MPD;
  const $ = (id) => document.getElementById(id);
  let perfil = await MPD.init(); if (!perfil) return;
  const cat = await api('/catalogo');
  const TANDAS = ['Matutina', 'Vespertina', 'Extendida (JEE)', 'Nocturna'];

  function pintar() {
    $('nombre').value = perfil.nombre || ''; $('matricula').value = perfil.matricula || ''; $('centro').value = perfil.centro || '';
    $('distrito').value = perfil.distrito || ''; $('regional').value = perfil.regional || '';
    $('tanda').innerHTML = '<option value="">—</option>' + TANDAS.map((t) => `<option>${t}</option>`).join(''); $('tanda').value = perfil.tanda || '';
    $('email').textContent = perfil.email;
    $('areas').innerHTML = perfil.areas.map((a) => `<div class="${cls.card} !p-3 flex items-center gap-3" data-id="${a.id}">
      <span class="${cls.icon} text-primary">${esc(a.icono)}</span>
      <div class="flex-1 min-w-0"><div class="text-title-sm">${esc(a.nombre)}</div>
        <input data-f="grados" class="${cls.input} !py-1 mt-1" placeholder="Grados (ej. 4to y 5to)" value="${esc(a.grados)}"></div>
      <label class="flex flex-col items-center text-label-sm text-on-surface-variant gap-1"><input type="checkbox" data-f="activa" class="h-5 w-5 accent-[#0f4c81]" ${a.activa ? 'checked' : ''}>Activa</label></div>`).join('');
    const aj = perfil.ajustes;
    $('a-comp').checked = !!aj.auto_competencias; $('a-ind').checked = !!aj.sugerir_indicadores; $('a-fmt').checked = !!aj.formato_estandar;
    $('plantilla').value = aj.plantilla_impresion || 'minerd-2024';
    secciones();
  }
  function secciones() {
    const total = perfil.secciones.reduce((n, s) => n + (s.estudiantes || 0), 0);
    $('sec-total').textContent = total ? total + ' estudiantes registrados' : 'Agrega tus secciones';
    $('secciones').innerHTML = perfil.secciones.map((s) => `<div class="${cls.card} !p-3 flex items-center justify-between" data-id="${s.id}">
      <div><div class="text-title-sm">${esc(s.grado)} ${esc(s.nivel)} · Sección ${esc(s.seccion)}</div>
      <div class="text-body-sm text-on-surface-variant">${esc([s.tanda, s.estudiantes != null && s.estudiantes + ' alumnos', s.areas].filter(Boolean).join(' • '))}</div></div>
      <button class="p-2 text-error" data-del aria-label="Eliminar sección"><span class="${cls.icon}">delete</span></button></div>`).join('') || '<p class="text-body-sm text-on-surface-variant">Sin secciones todavía.</p>';
  }

  $('s-nivel').innerHTML = cat.niveles.map((n) => `<option>${esc(n)}</option>`).join('');
  $('s-grado').innerHTML = cat.grados.map((n) => `<option>${esc(n)}</option>`).join('');
  $('s-tanda').innerHTML = '<option value="">Tanda</option>' + TANDAS.map((t) => `<option>${t}</option>`).join('');

  $('s-add').onclick = async () => {
    const seccion = $('s-seccion').value.trim(); if (!seccion) return toast('Indica la sección (A, B, C…)', true);
    try {
      const s = await api('/perfil/secciones', { method: 'POST', body: { nivel: $('s-nivel').value, grado: $('s-grado').value, seccion, tanda: $('s-tanda').value || null, estudiantes: $('s-est').value === '' ? null : +$('s-est').value, areas: $('s-areas').value.trim() } });
      perfil.secciones.push(s); secciones(); $('s-seccion').value = $('s-est').value = $('s-areas').value = '';
    } catch (e) { toast(e.message, true); }
  };
  $('secciones').onclick = async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    if (!confirm('¿Eliminar esta sección?')) return;
    try { await api('/perfil/secciones/' + id, { method: 'DELETE' }); perfil.secciones = perfil.secciones.filter((s) => s.id !== id); secciones(); } catch (err) { toast(err.message, true); }
  };

  $('guardar').onclick = async () => {
    $('guardar').disabled = true;
    try {
      const nuevo = await api('/perfil', { method: 'PUT', body: {
        nombre: $('nombre').value.trim() || undefined, matricula: $('matricula').value.trim(), centro: $('centro').value.trim(),
        distrito: $('distrito').value.trim(), regional: $('regional').value.trim(), tanda: $('tanda').value,
        ajustes: { auto_competencias: $('a-comp').checked, sugerir_indicadores: $('a-ind').checked, formato_estandar: $('a-fmt').checked, plantilla_impresion: $('plantilla').value } } });
      const areas = [...document.querySelectorAll('#areas [data-id]')].map((d) => ({ area_id: +d.dataset.id, activa: d.querySelector('[data-f="activa"]').checked, principal: false, grados: d.querySelector('[data-f="grados"]').value.trim() }));
      await api('/perfil/areas', { method: 'PUT', body: areas });
      perfil = await api('/perfil'); pintar(); document.querySelectorAll('[data-bind="distrito-tanda"]').forEach((e) => { e.textContent = [nuevo.distrito, nuevo.tanda].filter(Boolean).join(' • ') || nuevo.centro || ''; });
      toast('Configuración guardada');
    } catch (e) { toast(e.message, true); }
    $('guardar').disabled = false;
  };
  $('salir').onclick = MPD.logout;
  pintar();
})();
