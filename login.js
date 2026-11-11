(function () {
  if (MPD.token()) { location.href = 'planes.html'; return; }
  let modo = 'login';
  const $ = (id) => document.getElementById(id);
  function pintar() {
    const reg = modo === 'registro';
    $('campo-nombre').classList.toggle('hidden', !reg);
    $('titulo').textContent = reg ? 'Crea tu cuenta' : 'Inicia sesión';
    $('enviar').textContent = reg ? 'Crear cuenta' : 'Entrar';
    $('cambiar').textContent = reg ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crea tu cuenta';
    $('password').autocomplete = reg ? 'new-password' : 'current-password';
    $('error').textContent = '';
  }
  $('cambiar').onclick = () => { modo = modo === 'login' ? 'registro' : 'login'; pintar(); };
  $('f').onsubmit = async (e) => {
    e.preventDefault();
    $('enviar').disabled = true; $('error').textContent = '';
    try {
      const body = { email: $('email').value, password: $('password').value };
      if (modo === 'registro') body.nombre = $('nombre').value;
      const r = await MPD.api('/auth/' + modo, { method: 'POST', body });
      MPD.setToken(r.token);
      location.href = modo === 'registro' ? 'ajustes.html' : 'planes.html';
    } catch (err) {
      $('error').textContent = err.message;
      $('enviar').disabled = false;
    }
  };
  pintar();
})();
