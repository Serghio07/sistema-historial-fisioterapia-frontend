import { Activity, BadgeHelp, BookOpenText, Dumbbell, HeartPulse, Megaphone, NotebookPen, Sparkles, Stethoscope } from 'lucide-react';

const p = (text) => `<p>${text}</p>`;
const h2 = (text) => `<h2>${text}</h2>`;
const h3 = (text) => `<h3>${text}</h3>`;
const ul = (...items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const ol = (...items) => `<ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>`;

const templates = [
  { id: 'educativo', name: 'Artículo educativo', icon: BookOpenText, description: 'Explica un tema de salud de forma clara, completa y confiable.', structure: 'Introducción · Causas · Síntomas · Tratamiento · Recomendaciones', content: [
    h2('Introducción'), p('[Presenta el tema, su importancia y a quién puede ayudar esta información.]'),
    h2('¿Qué es [nombre de la condición o tema]?'), p('[Define el concepto con palabras sencillas y contexto clínico.]'),
    h2('Causas principales'), ul('[Causa principal 1]', '[Causa principal 2]', '[Causa principal 3]'),
    h2('Síntomas más frecuentes'), ul('[Síntoma 1]', '[Síntoma 2]', '[Síntoma 3]'),
    h2('¿Cómo se diagnostica?'), p('[Describe la valoración profesional, las pruebas y los estudios que pueden ser necesarios.]'),
    h2('Opciones de tratamiento'), p('[Explica las alternativas de tratamiento y cuándo se indican.]'),
    h3('Participación de la fisioterapia'), p('[Explica cómo la fisioterapia contribuye al alivio, recuperación o prevención.]'),
    h2('Recomendaciones'), ul('[Recomendación práctica 1]', '[Recomendación práctica 2]', '[Cuándo consultar a un profesional]'),
    h2('Conclusión'), p('[Resume los puntos clave y cierra con una orientación profesional.]')
  ].join('') },
  { id: 'consejos', name: 'Consejos de salud', icon: HeartPulse, description: 'Comparte recomendaciones prácticas y fáciles de aplicar.', structure: 'Introducción · Consejos numerados · Errores · Recomendación', content: [
    h2('Introducción'), p('[Explica brevemente qué problema ayudan a prevenir o mejorar estos consejos.]'),
    h2('[Número] consejos para [objetivo]'), ol('<strong>[Consejo 1]</strong><p>[Explica cómo aplicarlo y por qué funciona.]</p>', '<strong>[Consejo 2]</strong><p>[Añade una indicación práctica.]</p>', '<strong>[Consejo 3]</strong><p>[Incluye una alternativa o ejemplo.]</p>'),
    h2('Errores comunes que debes evitar'), ul('[Error común 1 y cómo corregirlo]', '[Error común 2 y cómo corregirlo]', '[Error común 3]'),
    h2('Recomendación profesional'), p('[Indica cuándo conviene solicitar una valoración fisioterapéutica personalizada.]')
  ].join('') },
  { id: 'tratamiento', name: 'Tratamiento fisioterapéutico', icon: Stethoscope, description: 'Presenta un tratamiento, su proceso y sus beneficios.', structure: 'Descripción · Pacientes · Procedimiento · Sesiones · Beneficios', content: [
    h2('¿En qué consiste el tratamiento?'), p('[Describe el tratamiento y el objetivo terapéutico principal.]'),
    h2('¿Para qué pacientes está recomendado?'), ul('[Perfil o condición 1]', '[Perfil o condición 2]', '[Caso que requiere evaluación previa]'),
    h2('¿Cómo se realiza?'), p('[Describe el procedimiento paso a paso y las técnicas utilizadas.]'),
    h3('Duración de cada sesión'), p('[Duración aproximada y factores que pueden modificarla.]'),
    h3('Número de sesiones'), p('[Cantidad o frecuencia orientativa según la valoración individual.]'),
    h2('Beneficios'), ul('[Beneficio 1]', '[Beneficio 2]', '[Beneficio 3]'),
    h2('Cuidados antes y después'), ul('[Cuidado previo]', '[Cuidado posterior]', '[Recomendación en casa]'),
    h2('Agenda una valoración'), p('[Invita a reservar una valoración profesional en Physio Active e incluye el canal de contacto.]')
  ].join('') },
  { id: 'lesion', name: 'Lesión o patología', icon: Activity, description: 'Informa sobre una condición, su evaluación y recuperación.', structure: 'Definición · Causas · Riesgos · Evaluación · Recuperación · Alertas', content: [
    h2('¿Qué es [nombre de la lesión o patología]?'), p('[Definición sencilla y zona del cuerpo afectada.]'),
    h2('Causas'), ul('[Causa 1]', '[Causa 2]', '[Causa 3]'), h2('Síntomas'), ul('[Síntoma frecuente 1]', '[Síntoma frecuente 2]', '[Limitación funcional habitual]'),
    h2('Factores de riesgo'), ul('[Factor de riesgo 1]', '[Factor de riesgo 2]', '[Factor de riesgo 3]'),
    h2('Evaluación y diagnóstico'), p('[Explica cómo se realiza la evaluación clínica y si pueden requerirse estudios.]'),
    h2('Tratamiento'), p('[Describe las opciones de tratamiento y el papel del equipo profesional.]'),
    h2('Recuperación'), p('[Orienta sobre etapas, tiempos aproximados y hábitos que favorecen la recuperación.]'),
    h2('Señales de alerta'), ul('[Señal que requiere atención inmediata]', '[Síntoma que no debe ignorarse]', '[Cuándo acudir a un servicio médico]')
  ].join('') },
  { id: 'ejercicios', name: 'Ejercicios y rehabilitación', icon: Dumbbell, description: 'Organiza una rutina segura con instrucciones editables.', structure: 'Objetivo · Indicaciones · Ejercicios · Repeticiones · Precauciones', content: [
    h2('Objetivo de la rutina'), p('[Indica qué capacidad, zona o etapa de rehabilitación se trabajará.]'),
    h2('Indicaciones generales'), ul('[Material necesario]', '[Posición inicial]', '[Frecuencia recomendada]'), h2('Ejercicios'),
    h3('1. [Nombre del ejercicio]'), p('[Describe la ejecución paso a paso.]'), p('<strong>Repeticiones:</strong> [series, repeticiones y descanso].'),
    h3('2. [Nombre del ejercicio]'), p('[Describe la ejecución paso a paso.]'), p('<strong>Repeticiones:</strong> [series, repeticiones y descanso].'),
    h3('3. [Nombre del ejercicio]'), p('[Describe la ejecución paso a paso.]'), p('<strong>Repeticiones:</strong> [series, repeticiones y descanso].'),
    h2('Precauciones'), ul('[Precaución 1]', '[Cómo adaptar la intensidad]', '[Cuándo detener el ejercicio]'),
    h2('Errores comunes'), ul('[Error 1 y su corrección]', '[Error 2 y su corrección]'),
    h2('Advertencia médica'), p('<strong>Esta rutina es informativa y no sustituye una evaluación profesional.</strong> [Indica cuándo consultar a un médico o fisioterapeuta.]')
  ].join('') },
  { id: 'promocion', name: 'Promoción de servicio', icon: Megaphone, description: 'Comunica el valor de un servicio y anima a reservar.', structure: 'Servicio · Beneficios · Público · Disponibilidad · Reserva', content: [
    h2('[Nombre del servicio]'), p('[Describe el servicio, el problema que atiende y qué lo hace especial en Physio Active.]'),
    h2('Beneficios principales'), ul('[Beneficio 1]', '[Beneficio 2]', '[Beneficio 3]'),
    h2('¿Para quién está indicado?'), p('[Describe el público objetivo, sus necesidades y condiciones relevantes.]'),
    h2('Disponibilidad'), p('[Indica días, horarios, sede, duración o vigencia de la promoción.]'),
    h2('Reserva tu valoración'), p('[Incluye una llamada clara a reservar, teléfono, WhatsApp o canal de contacto.]')
  ].join('') },
  { id: 'faq', name: 'Preguntas frecuentes', icon: BadgeHelp, description: 'Responde de forma directa las dudas más habituales.', structure: 'Pregunta y respuesta · Pregunta y respuesta · Contacto', content: [
    h2('Preguntas frecuentes sobre [tema o servicio]'), p('[Breve introducción a las dudas que se resolverán.]'),
    h3('¿[Pregunta frecuente 1]?'), p('[Respuesta clara y breve.]'), h3('¿[Pregunta frecuente 2]?'), p('[Respuesta editable con detalles prácticos.]'),
    h3('¿[Pregunta frecuente 3]?'), p('[Respuesta editable.]'), h3('¿[Pregunta frecuente 4]?'), p('[Respuesta editable.]'),
    h2('¿Tienes otra pregunta?'), p('[Indica cómo contactar a Physio Active para recibir orientación.]')
  ].join('') },
  { id: 'blank', name: 'Comenzar en blanco', icon: Sparkles, description: 'Abre un espacio limpio para crear una estructura propia.', structure: 'Lienzo vacío · Total libertad de edición', content: '' }
];

const visualLayouts = {
  educativo: { image: '/blog-templates/articulo-educativo.png', label: 'Imagen de portada completa', width: '100%', alignment: 'center' },
  consejos: { image: '/blog-templates/consejos-salud.png', label: 'Imagen destacada centrada', width: '75%', alignment: 'center' },
  tratamiento: { image: '/blog-templates/tratamiento.jpeg', label: 'Imagen lateral izquierda', width: '50%', alignment: 'left' },
  lesion: { image: '/blog-templates/lesion.jpeg', label: 'Imagen lateral derecha', width: '50%', alignment: 'right' },
  ejercicios: { image: '/blog-templates/ejercicios.png', label: 'Imagen panorámica', width: '100%', alignment: 'center' },
  promocion: { image: '/blog-templates/promocion.jpeg', label: 'Imagen promocional destacada', width: '75%', alignment: 'center' }
};

export const BUILT_IN_TEMPLATES = templates.map((template) => {
  const layout = visualLayouts[template.id];
  if (!layout) return template;
  const margin = layout.alignment === 'left' ? '0 auto 1rem 0' : layout.alignment === 'right' ? '0 0 1rem auto' : '0 auto 1rem';
  return {
    ...template,
    previewImage: layout.image,
    layoutLabel: layout.label,
    content: `<img src="${layout.image}" alt="[Describe esta imagen]" data-alignment="${layout.alignment}" style="display:block;width:${layout.width};height:auto;margin:${margin};border-radius:12px">${template.content}`
  };
});

export const CUSTOM_TEMPLATE_ICON = NotebookPen;
export const CUSTOM_TEMPLATES_KEY = 'physio_blog_custom_templates';
