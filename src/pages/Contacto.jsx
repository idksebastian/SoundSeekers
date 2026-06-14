import { useState } from 'react'
import { Link } from 'react-router-dom'

const reasons = [
  { value: 'soporte', label: '🛠️ Soporte técnico' },
  { value: 'privacidad', label: '🔒 Solicitud de privacidad / datos personales' },
  { value: 'derechos', label: '🎵 Derechos de autor o contenido' },
  { value: 'artista', label: '🎤 Verificación de artista' },
  { value: 'legal', label: '⚖️ Consulta legal' },
  { value: 'otro', label: '💬 Otro' },
]

const contacts = [
  { icon: '✉️', label: 'Soporte general', value: 'soporte@soundseekers.co' },
  { icon: '🔒', label: 'Privacidad y datos', value: 'privacidad@soundseekers.co' },
  { icon: '⚖️', label: 'Asuntos legales', value: 'legal@soundseekers.co' },
  { icon: '📍', label: 'Ubicación', value: 'Bogotá, Colombia' },
]

export default function Contacto() {
  const [form, setForm] = useState({ nombre: '', email: '', motivo: '', mensaje: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.mensaje) return
    setLoading(true)
    // Simulación de envío — aquí conectarías con tu backend o servicio de email
    await new Promise(r => setTimeout(r, 1200))
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '64px 32px 48px', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Estamos aquí</p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          Contáctanos
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          ¿Tienes dudas, sugerencias o necesitas ayuda? Escríbenos y te responderemos lo antes posible.
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 32px 0', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
        <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
        <span>›</span>
        <span>Contacto</span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>

        {/* Panel izquierdo — info de contacto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Canales de contacto */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>Canales de contacto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{c.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tiempos de respuesta */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>Tiempos de respuesta</h2>
            {[
              { tipo: 'Soporte técnico', tiempo: '24–48 horas hábiles' },
              { tipo: 'Solicitudes de privacidad', tiempo: '10 días hábiles (Ley 1581)' },
              { tipo: 'Derechos de autor', tiempo: '5 días hábiles' },
              { tipo: 'Consultas generales', tiempo: '72 horas hábiles' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{r.tipo}</span>
                <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, background: '#f5f3ff', padding: '3px 10px', borderRadius: 100 }}>{r.tiempo}</span>
              </div>
            ))}
          </div>

          {/* Links legales */}
          <div style={{ background: '#f5f3ff', borderRadius: 20, border: '1px solid #ede9fe', padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', margin: '0 0 12px' }}>Documentos legales</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/terminos" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📄</span> Términos de Uso
              </Link>
              <Link to="/privacidad" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🔒</span> Política de Privacidad
              </Link>
              <Link to="/cookies" style={{ fontSize: 13, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🍪</span> Política de Cookies
              </Link>
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
                ✅
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>¡Mensaje enviado!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                Recibimos tu mensaje. Te responderemos a <strong>{form.email}</strong> en el menor tiempo posible.
              </p>
              <button onClick={() => { setSent(false); setForm({ nombre: '', email: '', motivo: '', mensaje: '' }) }}
                style={{ background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 100, border: '1px solid #ede9fe', cursor: 'pointer', fontFamily: 'inherit' }}>
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 24px' }}>Envíanos un mensaje</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Nombre */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
                  <input
                    name="nombre" value={form.nombre} onChange={handleChange} required
                    placeholder="Tu nombre"
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Correo electrónico *</label>
                  <input
                    name="email" type="email" value={form.email} onChange={handleChange} required
                    placeholder="tu@correo.com"
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Motivo de contacto</label>
                  <select
                    name="motivo" value={form.motivo} onChange={handleChange}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Selecciona un motivo...</option>
                    {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Mensaje */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Mensaje *</label>
                  <textarea
                    name="mensaje" value={form.mensaje} onChange={handleChange} required
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    rows={5}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {/* Aviso legal */}
                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                  Al enviar este formulario, aceptas que SoundSeekers use tu información para responder tu solicitud, de acuerdo con nuestra{' '}
                  <Link to="/privacidad" style={{ color: '#7c3aed', fontWeight: 600 }}>Política de Privacidad</Link>.
                </p>

                {/* Botón */}
                <button
                  type="submit"
                  disabled={loading || !form.nombre || !form.email || !form.mensaje}
                  style={{
                    background: loading || !form.nombre || !form.email || !form.mensaje ? '#e5e7eb' : '#7c3aed',
                    color: loading || !form.nombre || !form.email || !form.mensaje ? '#9ca3af' : '#fff',
                    fontWeight: 700, fontSize: 14, padding: '13px', borderRadius: 12,
                    border: 'none', cursor: loading || !form.nombre || !form.email || !form.mensaje ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Responsive fix */}
      <style>{`
        @media (max-width: 700px) {
          div[style*="grid-template-columns: 1fr 1.5fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
