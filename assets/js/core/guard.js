/**
 * Pinjam.in - Pre-render page guard (classic script, load in <head>).
 *
 *   <script src="../assets/js/core/guard.js" data-roles="Admin"></script>
 *
 * Runs before the page paints: no session → login, wrong role → that role's home.
 * This only controls what the browser shows; the backend's role checks (401/403)
 * are what actually protect data.
 */
;(function () {
  var script = document.currentScript
  var root = new URL('../../../', script.src)
  var roles = (script.getAttribute('data-roles') || '').split(',').map(function (r) { return r.trim() }).filter(Boolean)

  var user = null
  try {
    user = JSON.parse(localStorage.getItem('pinjamin.user') || 'null')
    while (user && (user.user || user.me)) user = user.user || user.me
  } catch (e) {
    user = null
  }
  var token = localStorage.getItem('pinjamin.token')

  function go(path) {
    document.documentElement.style.visibility = 'hidden'
    window.location.replace(new URL(path, root).href)
  }

  if (!user || !token) {
    go('auth/login.html')
  } else if (roles.length && roles.indexOf(user.role) === -1) {
    go(user.role === 'Admin' ? 'admin/dashboard.html' : 'pages/catalog.html')
  }
})()
