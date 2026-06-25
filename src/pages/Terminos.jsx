import { Link } from 'react-router-dom'

const sections = [
  {
    title: '1. Aceptación de los términos',
    content: `Al acceder o usar SoundSeekers, confirmas que has leído, entendido y aceptado estos Términos de Uso. Si no estás de acuerdo con alguna parte, debes dejar de usar la plataforma de inmediato. Estos términos aplican a todos los usuarios: oyentes, artistas y visitantes.`
  },
  {
    title: '2. Descripción del servicio',
    content: `SoundSeekers es una plataforma digital de descubrimiento y distribución musical enfocada en artistas emergentes latinoamericanos. Permite a los artistas subir, compartir y promocionar su música, y a los oyentes descubrir, escuchar y conectar con nuevos talentos. El servicio se presta a través de nuestra aplicación web disponible en soundseekers.co.`
  },
  {
    title: '3. Registro y cuenta de usuario',
    content: `Para acceder a ciertas funciones debes crear una cuenta. Al registrarte, garantizas que:
    
- Tienes al menos 13 años de edad.
- La información que proporcionas es veraz, actual y completa.
- Eres responsable de mantener la confidencialidad de tu contraseña.
- Notificarás de inmediato cualquier uso no autorizado de tu cuenta.

SoundSeekers se reserva el derecho de suspender o eliminar cuentas que incumplan estos términos.`
  },
  {
    title: '4. Contenido del usuario',
    content: `Al subir música, imágenes, posts o cualquier otro contenido a SoundSeekers, declaras y garantizas que:

- Eres el titular o tienes los derechos necesarios sobre dicho contenido.
- Tu contenido no infringe derechos de propiedad intelectual de terceros.
- Tu contenido no contiene material ofensivo, ilegal, discriminatorio o que vulnere derechos de otras personas.

Al publicar contenido, otorgas a SoundSeekers una licencia no exclusiva, gratuita y mundial para mostrar, reproducir y distribuir dicho contenido dentro de la plataforma con el fin de prestar el servicio.`
  },
  {
    title: '5. Contenido musical y licencia de uso',
    content: `Al subir contenido musical a SoundSeekers, el artista declara y garantiza que:

- Es el titular original o tiene autorización expresa de los titulares de todos los derechos de autor, derechos conexos y derechos de propiedad intelectual sobre el contenido subido, incluyendo composición, letra, interpretación y producción fonográfica.
- El contenido no infringe derechos de terceros, no contiene material con restricciones de licencia incompatibles con esta plataforma, y cumple con la legislación colombiana vigente, en particular la Ley 23 de 1982 y la Ley 1915 de 2018 sobre derechos de autor.

Licencia otorgada a SoundSeekers

Al subir contenido, el artista otorga a SoundSeekers una licencia no exclusiva, gratuita, mundial y por el tiempo que el contenido permanezca en la plataforma, para reproducir, almacenar, distribuir, comunicar públicamente y mostrar el contenido con el único propósito de operar y promocionar la plataforma. Esta licencia no transfiere la titularidad de los derechos al artista y puede revocarse en cualquier momento eliminando el contenido de la plataforma.

Reclamaciones de derechos

Si consideras que algún contenido publicado en SoundSeekers infringe tus derechos de autor, puedes enviar una reclamación formal a soundseekers.co@gmail.com indicando tu nombre completo, descripción del contenido protegido, enlace al contenido en cuestión y declaración de que eres el titular o representante autorizado. SoundSeekers se compromete a revisar y gestionar cada reclamación en un plazo máximo de 5 días hábiles.`
  },
  {
    title: '6. Propiedad intelectual',
    content: `Todo el contenido propio de SoundSeekers — incluyendo diseño, logotipos, interfaz, código fuente y elementos visuales — está protegido por las leyes de propiedad intelectual de Colombia y los tratados internacionales. Queda prohibida la reproducción, copia o uso de estos elementos sin autorización escrita previa de SoundSeekers.`
  },
  {
    title: '7. Conductas prohibidas',
    content: `Está expresamente prohibido:

- Subir música o contenido sin tener los derechos correspondientes.
- Usar la plataforma para distribuir spam, malware o contenido engañoso.
- Intentar acceder sin autorización a sistemas, cuentas o datos de otros usuarios.
- Usar bots, scripts u otros medios automatizados para interactuar con la plataforma.
- Publicar contenido que promueva la violencia, el odio, la discriminación o actividades ilegales.
- Suplantar la identidad de otras personas o entidades.`
  },
  {
    title: '8. Cancelación y suspensión',
    content: `SoundSeekers puede suspender o eliminar tu cuenta en cualquier momento si detecta incumplimiento de estos términos, sin previo aviso y sin responsabilidad alguna. El usuario puede cancelar su cuenta en cualquier momento desde la configuración de su perfil. La cancelación no implica la devolución de ningún tipo de pago realizado.`
  },
  {
    title: '9. Limitación de responsabilidad',
    content: `SoundSeekers no garantiza la disponibilidad continua e ininterrumpida del servicio. En ningún caso será responsable por daños indirectos, incidentales o consecuentes derivados del uso o la imposibilidad de uso de la plataforma. El servicio se presta "tal cual" sin garantías de ningún tipo.`
  },
  {
    title: '10. Ley aplicable',
    content: `Estos términos se rigen por las leyes de la República de Colombia, en particular la Ley 1480 de 2011 (Estatuto del Consumidor), la Ley 527 de 1999 (Comercio Electrónico) y la Ley 1915 de 2018 (Derechos de Autor). Cualquier controversia será resuelta por los jueces competentes de la ciudad de Bogotá, Colombia.`
  },
  {
    title: '11. Modificaciones',
    content: `SoundSeekers puede modificar estos Términos de Uso en cualquier momento. Los cambios serán notificados a través de la plataforma o por correo electrónico. El uso continuado de la plataforma después de la notificación implica la aceptación de los nuevos términos.`
  },
]

export default function Terminos() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '64px 32px 48px', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Legal</p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          Términos de Uso
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Última actualización: junio de 2026
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 32px 0', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
        <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
        <span>›</span>
        <span>Términos de uso</span>
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151', margin: 0 }}>
            Bienvenido a <strong>SoundSeekers</strong>. Estos Términos de Uso regulan el acceso y uso de nuestra plataforma. Te recomendamos leerlos detenidamente antes de usar nuestros servicios. Si tienes preguntas, puedes contactarnos en{' '}
            <a href="mailto:soundseekers.co@gmail.com" style={{ color: '#7c3aed', fontWeight: 600 }}>soundseekers.co@gmail.com</a>.
          </p>
        </div>
      </div>

      {/* Secciones */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 12px' }}>{s.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#6b7280', margin: 0, whiteSpace: 'pre-line' }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* Footer legal */}
        <div style={{ marginTop: 32, padding: '24px 32px', background: '#f5f3ff', borderRadius: 20, border: '1px solid #ede9fe', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, margin: '0 0 8px' }}>¿Tienes preguntas sobre estos términos?</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Puedes escribirnos y te responderemos a la brevedad.</p>
          <Link to="/contacto" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 100, textDecoration: 'none' }}>
            Contáctanos
          </Link>
        </div>

        {/* Links a otras políticas */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/privacidad" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Política de Privacidad</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/cookies" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Política de Cookies</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/contacto" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Contacto</Link>
        </div>
      </div>
    </div>
  )
}