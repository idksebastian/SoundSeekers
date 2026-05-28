import { Link } from 'react-router-dom'

const types = [
  {
    icon: '🔒',
    name: 'Cookies esenciales',
    desc: 'Necesarias para el funcionamiento básico de la plataforma. Sin ellas, no podrías iniciar sesión ni usar funciones clave.',
    examples: 'Sesión de usuario, autenticación, seguridad CSRF.',
    required: true,
  },
  {
    icon: '📊',
    name: 'Cookies analíticas',
    desc: 'Nos ayudan a entender cómo los usuarios interactúan con la plataforma para mejorar la experiencia.',
    examples: 'Páginas visitadas, tiempo en la plataforma, errores encontrados.',
    required: false,
  },
  {
    icon: '⚙️',
    name: 'Cookies de preferencias',
    desc: 'Recuerdan tus configuraciones personales para ofrecerte una experiencia más personalizada.',
    examples: 'Volumen del reproductor, género musical preferido, tema visual.',
    required: false,
  },
]

const sections = [
  {
    title: '¿Qué son las cookies?',
    content: `Las cookies son pequeños archivos de texto que los sitios web almacenan en tu navegador o dispositivo cuando los visitas. Sirven para recordar tus preferencias, mantener tu sesión activa y recopilar información sobre cómo usas la plataforma.\n\nEn SoundSeekers usamos cookies propias (gestionadas por nosotros) y no usamos cookies de terceros con fines publicitarios.`
  },
  {
    title: '¿Cómo usamos las cookies?',
    content: `Usamos cookies para:\n\n• Mantener tu sesión iniciada mientras navegas por la plataforma.\n• Recordar tus preferencias de reproducción y configuración.\n• Analizar el uso de la plataforma de forma anónima para mejorar el servicio.\n• Garantizar la seguridad de las transacciones y prevenir el fraude.\n\nNo usamos cookies para mostrarte publicidad ni compartimos información de cookies con terceros con fines comerciales.`
  },
  {
    title: 'Tu control sobre las cookies',
    content: `Puedes controlar y gestionar las cookies desde la configuración de tu navegador. Ten en cuenta que deshabilitar ciertas cookies puede afectar el funcionamiento de la plataforma.\n\nCómo gestionar cookies en los principales navegadores:\n\n• Chrome: Configuración → Privacidad y seguridad → Cookies\n• Firefox: Opciones → Privacidad y seguridad → Cookies\n• Safari: Preferencias → Privacidad → Gestionar datos de sitios web\n• Edge: Configuración → Privacidad, búsqueda y servicios → Cookies`
  },
  {
    title: 'Cookies de Supabase',
    content: `Usamos Supabase como proveedor de autenticación y base de datos. Supabase puede establecer cookies técnicas necesarias para gestionar la sesión del usuario de forma segura. Estas cookies no se usan con fines de seguimiento o publicidad y se eliminan al cerrar sesión.`
  },
  {
    title: 'Almacenamiento local (localStorage)',
    content: `Además de cookies, SoundSeekers usa el almacenamiento local de tu navegador (localStorage) para guardar preferencias como:\n\n• Historial de conversaciones con SeekeAI.\n• Configuración del reproductor (volumen, modo de reproducción).\n• Preferencias de visualización.\n\nPuedes limpiar el almacenamiento local desde las herramientas de desarrollo de tu navegador o desde la configuración de la plataforma.`
  },
  {
    title: 'Actualizaciones de esta política',
    content: `Podemos actualizar esta Política de Cookies cuando sea necesario. Te notificaremos sobre cambios significativos a través de la plataforma. La fecha de última actualización siempre estará visible en la parte superior de esta página.`
  },
]

export default function Cookies() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '64px 32px 48px', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Legal</p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          Política de Cookies
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Última actualización: junio de 2025
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 32px 0', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
        <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
        <span>›</span>
        <span>Política de Cookies</span>
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151', margin: 0 }}>
            En <strong>SoundSeekers</strong> usamos cookies y tecnologías similares para garantizar el funcionamiento de la plataforma, mejorar tu experiencia y analizar cómo se usa el servicio. Esta política explica qué tipos de cookies utilizamos y cómo puedes controlarlas.
          </p>
        </div>
      </div>

      {/* Tipos de cookies */}
      <div style={{ maxWidth: 800, margin: '32px auto 0', padding: '0 32px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>Tipos de cookies que usamos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {types.map((t, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 20, border: `1px solid ${t.required ? '#ede9fe' : '#f3f4f6'}`, padding: '24px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{t.icon}</span>
                {t.required && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: 100 }}>Obligatoria</span>
                )}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>{t.name}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 10px' }}>{t.desc}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}><strong>Ejemplos:</strong> {t.examples}</p>
            </div>
          ))}
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

        {/* CTA */}
        <div style={{ marginTop: 32, padding: '24px 32px', background: '#f5f3ff', borderRadius: 20, border: '1px solid #ede9fe', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, margin: '0 0 8px' }}>¿Tienes preguntas sobre nuestras cookies?</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Escríbenos y te responderemos a la brevedad.</p>
          <Link to="/contacto" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 100, textDecoration: 'none' }}>
            Contáctanos
          </Link>
        </div>

        {/* Links */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/terminos" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Términos de Uso</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/privacidad" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Política de Privacidad</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/contacto" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Contacto</Link>
        </div>
      </div>
    </div>
  )
}
