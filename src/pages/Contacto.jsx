import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const reasons = [
  { value: 'soporte', label: 'Soporte técnico' },
  { value: 'privacidad', label: 'Solicitud de privacidad / datos personales' },
  { value: 'derechos', label: 'Derechos de autor o contenido' },
  { value: 'artista', label: 'Verificación de artista' },
  { value: 'legal', label: 'Consulta legal' },
  { value: 'otro', label: 'Otro' },
]

const contacts = [
  { label: 'Contacto general', value: 'soundseekers.co@gmail.com', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Ubicación', value: 'Bogotá, Colombia', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function Contacto() {
  const [form, setForm] = useState({ nombre: '', email: '', motivo: '', mensaje: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.mensaje) return
    setLoading(true)
    setError('')
    try {
      const { error: sbError } = await supabase
        .from('contact_messages')
        .insert([{
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          motivo: form.motivo || null,
          mensaje: form.mensaje.trim(),
        }])
      if (sbError) throw sbError
      setSent(true)
    } catch (err) {
      console.error(err)
      setError('Hubo un error al enviar tu mensaje. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
    background: '#f9fafb', color: '#111',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
        @media (max-width: 700px) {
          .contacto-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '64px 32px 48px', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Estamos aquí</p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          Contáctanos
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '0 auto', maxWidth: 480 }}>
          ¿Tienes dudas, sugerencias o necesitas ayuda? Escríbenos y te responderemos lo antes posible.
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 32px 0', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
        <Link to="/home" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
        <span>›</span>
        <span>Contacto</span>
      </div>

      <div className="contacto-grid" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>

        {/* Panel izquierdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Canales */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 20px' }}>Canales de contacto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={c.icon}/>
                    </svg>
                  </div>
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
              { tipo: 'Soporte técnico', tiempo: '24–48 h hábiles' },
              { tipo: 'Privacidad', tiempo: '10 días (Ley 1581)' },
              { tipo: 'Derechos de autor', tiempo: '5 días hábiles' },
              { tipo: 'Consultas generales', tiempo: '72 h hábiles' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{r.tipo}</span>
                <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, background: '#f5f3ff', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{r.tiempo}</span>
              </div>
            ))}
          </div>

          {/* Links legales */}
          <div style={{ background: '#f5f3ff', borderRadius: 20, border: '1px solid #ede9fe', padding: '20px 24px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', margin: '0 0 12px' }}>Documentos legales</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/terminos', label: 'Términos de Uso', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { to: '/privacidad', label: 'Política de Privacidad', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                { to: '/cookies', label: 'Política de Cookies', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              ].map(({ to, label, icon }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d={icon}/>
                  </svg>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>¡Mensaje enviado!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                Recibimos tu mensaje. Te responderemos a <strong>{form.email}</strong> lo antes posible.
              </p>
              <button onClick={() => { setSent(false); setForm({ nombre: '', email: '', motivo: '', mensaje: '' }) }}
                style={{ background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 100, border: '1px solid #ede9fe', cursor: 'pointer', fontFamily: 'inherit' }}>
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 24px' }}>Envíanos un mensaje</h2>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Tu nombre"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Correo electrónico *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@correo.com"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Motivo de contacto</label>
                  <select name="motivo" value={form.motivo} onChange={handleChange}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="">Selecciona un motivo...</option>
                    {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Mensaje *</label>
                  <textarea name="mensaje" value={form.mensaje} onChange={handleChange} required
                    placeholder="Cuéntanos en qué podemos ayudarte..." rows={5}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                  Al enviar este formulario, aceptas que SoundSeekers use tu información para responder tu solicitud, de acuerdo con nuestra{' '}
                  <Link to="/privacidad" style={{ color: '#7c3aed', fontWeight: 600 }}>Política de Privacidad</Link>.
                </p>

                <button type="submit" disabled={loading || !form.nombre || !form.email || !form.mensaje}
                  style={{
                    background: loading || !form.nombre || !form.email || !form.mensaje ? '#e5e7eb' : '#7c3aed',
                    color: loading || !form.nombre || !form.email || !form.mensaje ? '#9ca3af' : '#fff',
                    fontWeight: 700, fontSize: 14, padding: 13, borderRadius: 12,
                    border: 'none', cursor: loading || !form.nombre || !form.email || !form.mensaje ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                  {loading ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}