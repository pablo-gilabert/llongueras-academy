/** Curated, sourced public-facing institutional and course information. */

export interface TrainingOffer {
    id: string;
    title: string;
    titleEn: string;
    category: 'Carrera' | 'Corte' | 'Color' | 'Especialización';
    audience: 'Inicial' | 'Profesional' | 'Ambos';
    duration: string | null;
    description: string;
    descriptionEn: string;
    image: string;
    source: string;
}

export const ACADEMY_CONTACT = {
    address: 'Florida 378, piso 8, Ciudad Autónoma de Buenos Aires',
    phone: '+54 11 5746-2924',
    phoneLink: 'tel:+541157462924',
    whatsapp: 'https://wa.me/541157462924',
    maps: 'https://www.google.com/maps/search/?api=1&query=Florida+378+Piso+8+Buenos+Aires+Argentina',
} as const;

export const SOURCES = {
    academyUpdates: 'https://www.schoolandcollegelistings.com/AR/Buenos-Aires/200286546679031/Academia-Llongueras-Argentina',
    argentinaHistory: 'https://llonguerasargentina.com.ar/pages/historia',
    method: 'https://llonguerasinstitute.com/nosotros/el-metodo/',
    europeanInstitute: 'https://llonguerasinstitute.com/nosotros/historia/',
    founding: 'https://www.rtve.es/noticias/20230529/muere-peluquero-lluis-llongueras/2447888.shtml',
    esteban: 'https://www.agencianova.com/raros-peinados-nuevos/2020/03/09/84057/llongueras-cumple-40-anos-en-el-pais-y-reinaugura-su-academia-de-formacion-profesional/',
    brazil: 'https://llonguerasbrasil.blogspot.com/2010/08/esteban-tejada-o-braco-de-llongueras-na.html',
    hairBrasil: 'https://www.portalin.com.br/cena/llongueras-argentina-ensina-os-segredos-dos-cortes-estilos-comerciais/',
} as const;

// The school has published these training areas; this is not a live timetable.
// Only the two-year stylist career has a publicly verified duration.
export const TRAINING: TrainingOffer[] = [
    {
        id: 'career',
        title: 'Carrera de Estilista',
        titleEn: 'Professional Stylist Career',
        category: 'Carrera',
        audience: 'Inicial',
        duration: '2 años',
        description: 'Trayecto profesional anunciado por la academia con formación progresiva y módulos de especialización.',
        descriptionEn: 'A two-year professional pathway publicly announced by the school, with progressive training and specialist modules.',
        image: 'study.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'method',
        title: 'Método Llongueras: Cortes Programados',
        titleEn: 'Llongueras Method: Programmed Cuts',
        category: 'Corte',
        audience: 'Profesional',
        duration: null,
        description: 'Perfeccionamiento en particiones, proyecciones y trabajo estructural sobre grandes masas de cabello.',
        descriptionEn: 'Advanced work with sections, projection and structural cutting techniques using larger sections of hair.',
        image: 'mentor.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'feminine',
        title: 'Corte femenino',
        titleEn: 'Women’s Haircutting',
        category: 'Corte',
        audience: 'Ambos',
        duration: null,
        description: 'Módulo de formación técnica en corte femenino, publicado dentro de las propuestas de la academia.',
        descriptionEn: 'A technical haircutting module listed among the academy’s training areas.',
        image: 'technique.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'masculine',
        title: 'Corte masculino',
        titleEn: 'Men’s Haircutting',
        category: 'Corte',
        audience: 'Ambos',
        duration: null,
        description: 'Práctica y fundamentos del corte masculino, ofrecidos como módulo dentro del recorrido formativo.',
        descriptionEn: 'Men’s haircutting fundamentals and hands-on practice, announced as a modular training option.',
        image: 'salon.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'color-first',
        title: 'Color inicial',
        titleEn: 'Color Fundamentals',
        category: 'Color',
        audience: 'Inicial',
        duration: null,
        description: 'Introducción a los fundamentos del color, anunciada como módulo independiente de formación.',
        descriptionEn: 'An introduction to hair color fundamentals, listed as a standalone training module.',
        image: 'creative-session.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'color-advanced',
        title: 'Color avanzado',
        titleEn: 'Advanced Color',
        category: 'Color',
        audience: 'Profesional',
        duration: null,
        description: 'Módulo de profundización para profesionales que buscan ampliar sus recursos técnicos de color.',
        descriptionEn: 'A specialist module for professionals developing more advanced color techniques.',
        image: 'workshop.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'balayage',
        title: 'Técnicas de balayage',
        titleEn: 'Balayage Techniques',
        category: 'Color',
        audience: 'Profesional',
        duration: null,
        description: 'Capacitaciones especializadas de balayage difundidas en las actividades formativas de 2026.',
        descriptionEn: 'Specialized balayage sessions featured in the academy’s 2026 training communications.',
        image: 'group-work.webp',
        source: SOURCES.academyUpdates,
    },
    {
        id: 'makeup',
        title: 'Maquillaje',
        titleEn: 'Makeup',
        category: 'Especialización',
        audience: 'Inicial',
        duration: null,
        description: 'Área de formación publicada entre los módulos disponibles de la carrera y sus especializaciones.',
        descriptionEn: 'A training area mentioned among the academy’s career modules and specialization options.',
        image: 'creative-session.webp',
        source: SOURCES.academyUpdates,
    },
];

export const HISTORY = [
    {
        year: '1958',
        title: 'Barcelona',
        titleEn: 'Barcelona',
        text: 'Lluís Llongueras inicia su negocio de peluquería en Barcelona y comienza una trayectoria de innovación artística.',
        textEn: 'Lluís Llongueras establishes his salon in Barcelona, beginning a career of artistic innovation.',
        source: SOURCES.founding,
    },
    {
        year: '1972',
        title: 'Una peluquería sin fronteras de género',
        titleEn: 'Hairdressing beyond gender',
        text: 'Lluís Llongueras abre en España un salón unisex pionero que redefine las convenciones del sector.',
        textEn: 'Lluís Llongueras opens a pioneering unisex salon in Spain, challenging the conventions of the industry.',
        source: SOURCES.founding,
    },
    {
        year: '1974',
        title: 'París y Europa',
        titleEn: 'Paris and Europe',
        text: 'Tras impulsar su instituto de perfeccionamiento en los años setenta, abre un salón en la rue Saint-Honoré de París.',
        textEn: 'After developing a training institute in the 1970s, Llongueras opens a salon on rue Saint-Honoré in Paris.',
        source: SOURCES.argentinaHistory,
    },
    {
        year: '1980',
        title: 'Llegada a Argentina',
        titleEn: 'Arrival in Argentina',
        text: 'Esteban Tejada impulsa la presencia de la marca en el país y desarrolla su vínculo con la formación profesional.',
        textEn: 'Esteban Tejada introduces the brand in Argentina and helps develop its relationship with professional education.',
        source: SOURCES.esteban,
    },
    {
        year: '2013',
        title: 'Formación en Hair Brasil',
        titleEn: 'Training at Hair Brasil',
        text: 'Esteban Tejada participa como embajador de Llongueras en Hair Brasil, impartiendo formación sobre cortes comerciales y Cortes Programados.',
        textEn: 'Esteban Tejada represents Llongueras at Hair Brasil, teaching commercial styles and the Programmed Cuts method.',
        source: SOURCES.hairBrasil,
    },
    {
        year: '2020',
        title: 'Academia renovada',
        titleEn: 'Academy relaunch',
        text: 'La academia anuncia una nueva etapa en Buenos Aires, dirigida a principiantes y profesionales.',
        textEn: 'The academy announces a new chapter in Buenos Aires for beginners and working professionals.',
        source: SOURCES.esteban,
    },
    {
        year: '2026',
        title: 'Puente con Brasil',
        titleEn: 'A bridge to Brazil',
        text: 'La academia presenta a Paloma y Santhiago como embajadores de su propuesta educativa en Brasil.',
        textEn: 'The Argentine academy introduces Paloma and Santhiago as ambassadors of its educational approach in Brazil.',
        source: SOURCES.academyUpdates,
    },
] as const;
