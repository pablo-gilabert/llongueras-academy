/** Curated, sourced public-facing institutional and course information. */

export interface TrainingOffer {
    id: string;
    title: string;
    titleEn: string;
    titlePt: string;
    category: 'Carrera' | 'Corte' | 'Color' | 'Especialización';
    duration: string | null;
    description: string;
    descriptionEn: string;
    descriptionPt: string;
    image: string;
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

// These five course names were supplied by the academy for the first review.
// Images reuse the academy media already present in /public/media.
// Curricula, levels, schedules and duration are not assumed without confirmation.
export const TRAINING: TrainingOffer[] = [
    {
        id: 'assistant-hairdressing',
        title: 'Asistente de peluquería',
        titleEn: 'Hairdressing Assistant',
        titlePt: 'Assistente de cabeleireiro',
        category: 'Carrera',
        duration: null,
        description: 'Una propuesta para dar los primeros pasos en el salón, conocer su dinámica y desarrollar habilidades de apoyo al equipo profesional.',
        descriptionEn: 'An introduction to salon work, its day-to-day environment and the supporting skills used alongside professional stylists.',
        descriptionPt: 'Uma proposta para dar os primeiros passos no salão, conhecer sua dinâmica e desenvolver habilidades de apoio à equipe profissional.',
        image: 'classroom.webp',
    },
    {
        id: 'professional-career',
        title: 'Carrera Profesional',
        titleEn: 'Professional Hairdressing Program',
        titlePt: 'Formação Profissional em Cabeleireiro',
        category: 'Carrera',
        duration: null,
        description: 'Un recorrido de formación profesional que integra técnicas de peluquería, creatividad y práctica orientada al trabajo en salón.',
        descriptionEn: 'A professional learning pathway combining hairdressing techniques, creativity and practical salon-oriented experience.',
        descriptionPt: 'Um percurso de formação profissional que reúne técnicas de cabeleireiro, criatividade e prática voltada ao trabalho em salão.',
        image: 'group-work.webp',
    },
    {
        id: 'colorimetry',
        title: 'Colorimetría',
        titleEn: 'Hair Color Theory',
        titlePt: 'Colorimetria',
        category: 'Color',
        duration: null,
        description: 'Una introducción a la interpretación de tonos, armonías y fundamentos del color aplicados al trabajo capilar.',
        descriptionEn: 'An introduction to understanding tones, color harmony and the fundamentals of color as applied to hair.',
        descriptionPt: 'Uma introdução à interpretação de tons, harmonias e fundamentos da cor aplicados aos cabelos.',
        image: 'workshop.webp',
    },
    {
        id: 'womens-cutting',
        title: 'Corte Femenino',
        titleEn: 'Women’s Haircutting',
        titlePt: 'Corte Feminino',
        category: 'Corte',
        duration: null,
        description: 'Exploración del diseño y la técnica del corte femenino, con atención a formas, líneas y estilos para distintas necesidades.',
        descriptionEn: 'An exploration of women’s haircutting design and techniques, focusing on shapes, lines and styles for different needs.',
        descriptionPt: 'Uma exploração do design e das técnicas de corte feminino, com atenção a formas, linhas e estilos para diferentes necessidades.',
        image: 'technique.webp',
    },
    {
        id: 'mens-cutting',
        title: 'Corte masculino',
        titleEn: 'Men’s Haircutting',
        titlePt: 'Corte Masculino',
        category: 'Corte',
        duration: null,
        description: 'Acercamiento a las técnicas del corte masculino, sus proporciones, estructuras y terminaciones para diferentes estilos.',
        descriptionEn: 'An introduction to men’s haircutting techniques, proportions, structure and finishing for a range of styles.',
        descriptionPt: 'Uma introdução às técnicas de corte masculino, suas proporções, estruturas e acabamentos para diferentes estilos.',
        image: 'mentor.webp',
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
