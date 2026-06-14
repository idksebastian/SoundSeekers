import { Link } from 'react-router-dom'

const sections = [
  {
    title: '1. Responsable del tratamiento',
    content: `SoundSeekers es responsable del tratamiento de los datos personales recopilados a través de esta plataforma. Para cualquier consulta relacionada con el tratamiento de sus datos, puede contactarnos en:\n\nCorreo: privacidad@soundseekers.co\nDirección: Bogotá, Colombia`
  },
  {
    title: '2. Marco legal aplicable',
    content: `El tratamiento de sus datos personales se rige por:\n\n• Ley 1581 de 2012 — Protección de Datos Personales\n• Decreto 1377 de 2013 — Reglamentación de la Ley 1581\n• Decreto 886 de 2014 — Registro Nacional de Bases de Datos\n• Circular Externa 002 de 2015 de la SIC\n\nComo usuario, usted tiene los derechos de conocer, actualizar, rectificar y suprimir sus datos personales, así como revocar la autorización otorgada para su tratamiento.`
  },
  {
    title: '3. Datos que recopilamos',
    content: `Recopilamos los siguientes datos personales:\n\n• Datos de registro: nombre, correo electrónico y contraseña (cifrada).\n• Datos de perfil: foto de perfil, biografía, nombre artístico y redes sociales (opcionales).\n• Datos de uso: canciones reproducidas, artistas seguidos, interacciones en la comunidad.\n• Datos técnicos: dirección IP, tipo de navegador, sistema operativo y páginas visitadas.\n• Datos de contenido: música, imágenes y publicaciones subidas por artistas.\n\nNo recopilamos datos sensibles como origen racial, orientación sexual, información médica ni datos financieros.`
  },
  {
    title: '4. Finalidad del tratamiento',
    content: `Sus datos son utilizados exclusivamente para:\n\n• Gestionar su cuenta y prestar los servicios de la plataforma.\n• Personalizar su experiencia musical y realizar recomendaciones.\n• Permitir la comunicación entre artistas y oyentes.\n• Enviar notificaciones sobre actividad en su cuenta (con opción de desactivarlas).\n• Mejorar la plataforma mediante análisis estadísticos anónimos.\n• Cumplir con obligaciones legales aplicables en Colombia.`
  },
  {
    title: '5. Autorización del tratamiento',
    content: `De conformidad con la Ley 1581 de 2012, el tratamiento de sus datos personales requiere su autorización previa, expresa e informada. Al crear su cuenta en SoundSeekers, usted otorga dicha autorización. Puede revocarla en cualquier momento enviando una solicitud a privacidad@soundseekers.co, sin efectos retroactivos.`
  },
  {
    title: '6. Transferencia y transmisión de datos',
    content: `SoundSeekers no vende, alquila ni comparte sus datos personales con terceros con fines comerciales. Sus datos pueden ser compartidos únicamente con:\n\n• Proveedores de servicios técnicos (servidores, autenticación) que actúan bajo estrictas obligaciones de confidencialidad.\n• Autoridades competentes cuando sea requerido por ley.\n\nSupabase, nuestro proveedor de base de datos, cumple con estándares internacionales de seguridad (ISO 27001) y opera bajo acuerdos de procesamiento de datos conformes al GDPR europeo.`
  },
  {
    title: '7. Tiempo de conservación',
    content: `Sus datos personales se conservarán durante el tiempo que mantenga activa su cuenta en SoundSeekers y por el período adicional requerido por obligaciones legales o contractuales. Al eliminar su cuenta, sus datos serán suprimidos en un plazo máximo de 30 días hábiles, excepto aquellos que debamos conservar por mandato legal.`
  },
  {
    title: '8. Derechos del titular',
    content: `Como titular de sus datos personales, usted tiene derecho a:\n\n• Conocer los datos que tenemos sobre usted.\n• Actualizar o rectificar datos inexactos o incompletos.\n• Solicitar la supresión de sus datos cuando no haya obligación legal de conservarlos.\n• Revocar la autorización de tratamiento.\n• Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).\n\nPara ejercer estos derechos, envíe una solicitud a privacidad@soundseekers.co. Responderemos en un plazo máximo de 10 días hábiles.`
  },
  {
    title: '9. Seguridad de los datos',
    content: `Implementamos medidas técnicas y organizativas para proteger sus datos personales contra accesos no autorizados, pérdida, alteración o divulgación. Entre estas medidas se incluyen:\n\n• Cifrado de contraseñas con algoritmos seguros.\n• Conexiones HTTPS en toda la plataforma.\n• Control de acceso por roles a nuestra base de datos.\n• Políticas de seguridad a nivel de fila (Row Level Security) en Supabase.\n\nA pesar de nuestros esfuerzos, ningún sistema es 100% seguro. En caso de una brecha de seguridad que afecte sus datos, le notificaremos de acuerdo con la normativa vigente.`
  },
  {
    title: '10. Menores de edad',
    content: `SoundSeekers no está dirigida a menores de 13 años. Si tenemos conocimiento de que hemos recopilado datos de un menor sin el consentimiento de sus padres o tutores, procederemos a eliminar dicha información de inmediato. Si usted es padre o tutor y cree que su hijo ha proporcionado datos personales, contáctenos en privacidad@soundseekers.co.`
  },
]

export default function Privacidad() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '64px 32px 48px', color: '#fff', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Legal</p>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 12px', letterSpacing: '0.02em' }}>
          Política de Privacidad
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Última actualización: junio de 2025 · Ley 1581 de 2012
        </p>
      </div>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 32px 0', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
        <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link>
        <span>›</span>
        <span>Política de Privacidad</span>
      </div>

      {/* Intro */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 0' }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6', padding: '28px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#374151', margin: 0 }}>
            En <strong>SoundSeekers</strong> nos comprometemos a proteger su privacidad y a tratar sus datos personales de acuerdo con la legislación colombiana vigente. Esta política explica qué datos recopilamos, cómo los usamos y cuáles son sus derechos como titular.
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

        {/* CTA */}
        <div style={{ marginTop: 32, padding: '24px 32px', background: '#f5f3ff', borderRadius: 20, border: '1px solid #ede9fe', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, margin: '0 0 8px' }}>¿Quieres ejercer tus derechos como titular?</p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Escríbenos y gestionaremos tu solicitud en menos de 10 días hábiles.</p>
          <Link to="/contacto" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 100, textDecoration: 'none' }}>
            Contáctanos
          </Link>
        </div>

        {/* Links */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/terminos" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Términos de Uso</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/cookies" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Política de Cookies</Link>
          <span style={{ color: '#d1d5db' }}>·</span>
          <Link to="/contacto" style={{ fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Contacto</Link>
        </div>
      </div>
    </div>
  )
}
