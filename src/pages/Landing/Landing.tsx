/** Public institutional landing page and course discovery. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Check,
    Clock3,
    GraduationCap,
    MapPin,
    Menu,
    Phone,
    Search,
    Scissors,
    Sparkles,
    X,
} from 'lucide-react';
import { ACADEMY_CONTACT, HISTORY, SOURCES, TRAINING } from '../../data/Academy';
import { usePreferences } from '../../i18n/Preferences';
import Styles from './Landing.module.css';

const MEDIA_PATH = '/media/';

const GALLERY = [
    { src: 'mentor.webp', title: 'Aprender de quienes crean', titleEn: 'Learning from creative professionals' },
    { src: 'technique.webp', title: 'La técnica, en primer plano', titleEn: 'Technique up close' },
    { src: 'workshop.webp', title: 'Práctica con profesionales', titleEn: 'Learning alongside professionals' },
    { src: 'creative-session.webp', title: 'Cada detalle cuenta', titleEn: 'Every detail matters' },
    { src: 'classroom.webp', title: 'Un espacio para crecer', titleEn: 'A place to grow' },
    { src: 'graduates.webp', title: 'Una comunidad que evoluciona', titleEn: 'A community that evolves' },
];

const REGIONS = [
    {
        number: '01',
        label: 'ARGENTINA',
        headline: 'Buenos Aires, centro de formación',
        headlineEn: 'Buenos Aires, a home for learning',
        description: 'Con presencia desde 1980, la marca desarrolla en Argentina una tradición de formación en peluquería. La academia funciona en la peatonal Florida, en CABA.',
        descriptionEn: 'The brand has been present in Argentina since 1980. Its professional training tradition continues at the academy on Florida Street in Buenos Aires.',
        image: 'classroom.webp',
        source: SOURCES.esteban,
    },
    {
        number: '02',
        label: 'BRASIL',
        headline: 'Intercambio que cruza fronteras',
        headlineEn: 'Learning across borders',
        description: 'La marca desarrolló franquicias y formación profesional en Brasil desde fines de los años 2000; Esteban Tejada enseñó en Hair Brasil en 2013. En 2026, la academia argentina presentó a Paloma y Santhiago como embajadores educativos.',
        descriptionEn: 'The brand developed franchises and professional training in Brazil from the late 2000s; Esteban Tejada taught at Hair Brasil in 2013. In 2026, the Argentine academy appointed Paloma and Santhiago as educational ambassadors.',
        image: 'event.webp',
        source: SOURCES.academyUpdates,
    },
    {
        number: '03',
        label: 'EUROPA',
        headline: 'Un legado nacido en Barcelona',
        headlineEn: 'A legacy born in Barcelona',
        description: 'El recorrido europeo de Lluís Llongueras comprende la escuela internacional, la expansión hacia París y décadas de influencia en la peluquería creativa.',
        descriptionEn: 'Lluís Llongueras’s European story includes the international training institute, expansion into Paris, and decades of creative hairstyling influence.',
        image: 'seminar.webp',
        source: SOURCES.europeanInstitute,
    },
];

// Search is case- and accent-insensitive to support natural Spanish queries.
function normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Render the sourced public academy presentation independent of private records. */
export function Landing() {
    const { locale } = usePreferences();
    const english = locale === 'en';
    const [menuOpen, setMenuOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todas');
    const [audience, setAudience] = useState('Todos');
    const [expanded, setExpanded] = useState<string | null>(null);

    const categories = useMemo(() => ['Todas', ...new Set(TRAINING.map(course => course.category))], []);
    const query = normalizeSearch(search);
    const categoryLabel = (value: string) => english
        ? ({ Todas: 'All areas', Carrera: 'Career', Corte: 'Cutting', Color: 'Color', Especialización: 'Specialization' } as Record<string, string>)[value] ?? value
        : value;

    const filteredCourses = TRAINING.filter(course => {
        const searchableText = normalizeSearch(`${course.title} ${course.titleEn} ${course.description} ${course.category}`);
        return searchableText.includes(query)
            && (category === 'Todas' || course.category === category)
            && (audience === 'Todos' || course.audience === 'Ambos' || course.audience === audience);
    });

    const clearFilters = () => {
        setSearch('');
        setCategory('Todas');
        setAudience('Todos');
    };

    return (
        <div className={Styles.site} id="top">
            {/* A mobile-ready public header with independent campus access. */}
            <header className={Styles.header}>
                <Link to="/" className={Styles.wordmark} aria-label="Academia Llongueras, inicio">
                    <img src={`${MEDIA_PATH}llongueras-logo.png`} alt="Academia de Peluquería Llongueras Argentina" />
                </Link>
                <nav className={`${Styles.nav} ${menuOpen ? Styles.navOpen : ''}`} aria-label={english ? 'Public navigation' : 'Navegación pública'}>
                    <a href="#academia" onClick={() => setMenuOpen(false)}>{english ? 'The academy' : 'La academia'}</a>
                    <a href="#legado" onClick={() => setMenuOpen(false)}>{english ? 'Our story' : 'Trayectoria'}</a>
                    <a href="#metodo" onClick={() => setMenuOpen(false)}>{english ? 'The method' : 'El método'}</a>
                    <a href="#cursos" onClick={() => setMenuOpen(false)}>{english ? 'Training' : 'Formaciones'}</a>
                    <a href="#contacto" onClick={() => setMenuOpen(false)}>{english ? 'Contact' : 'Contacto'}</a>
                </nav>
                <div className={Styles.headerRight}>
                    <Link className={Styles.portalLink} to="/login">
                        <GraduationCap size={17} />
                        {english ? 'Campus access' : 'Acceso al campus'}
                        <ArrowUpRight size={15} />
                    </Link>
                    <button
                        className={Styles.menuToggle}
                        type="button"
                        aria-label={menuOpen ? (english ? 'Close menu' : 'Cerrar menú') : (english ? 'Open menu' : 'Abrir menú')}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(value => !value)}
                    >
                        {menuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </header>

            <main>
                {/* The silent film is locally hosted and uses a poster fallback. */}
                <section className={Styles.hero}>
                    <video
                        className={Styles.heroVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={`${MEDIA_PATH}film-poster.jpg`}
                        aria-hidden="true"
                    >
                        <source src={`${MEDIA_PATH}academy-film.mp4`} type="video/mp4" />
                    </video>
                    <div className={Styles.heroShade} />
                    <div className={Styles.heroInner}>
                        <span className={Styles.kicker}>
                            <span className={Styles.smallLine} /> ACADEMIA LLONGUERAS · BUENOS AIRES
                        </span>
                        <h1>{english ? <>
                            A legacy of technique.<br /><em>A future of creativity.</em>
                        </> : <>
                            Un legado de técnica.<br /><em>Un futuro de creatividad.</em>
                        </>}</h1>
                        <p>{english
                            ? 'From the Llongueras Method to contemporary practice: professional education built on technique, personal style and the joy of creating.'
                            : 'Del Método Llongueras a la práctica contemporánea: formación profesional que une técnica, estilo propio y pasión por crear.'}</p>
                        <div className={Styles.heroActions}>
                            <a href="#cursos" className={Styles.primaryButton}>
                                {english ? 'Explore training' : 'Conocé las formaciones'} <ArrowUpRight size={18} />
                            </a>
                            <a href="#legado" className={Styles.secondaryButton}>
                                {english ? 'Discover the history' : 'Descubrí la historia'} <ArrowDown size={18} />
                            </a>
                        </div>
                    </div>
                    <div className={Styles.heroSide}>LLONGUERAS / MÉTODO · ARTE · PROFESIÓN</div>
                    <div className={Styles.heroBottom}>
                        <span>01 — {english ? 'ORIGINS & EVOLUTION' : 'ORIGEN Y EVOLUCIÓN'}</span>
                        <span>{english ? 'SCROLL TO EXPLORE' : 'DESCUBRÍ MÁS'} ↓</span>
                    </div>
                </section>

                {/* Actual brand history informs the academy introduction. */}
                <section className={Styles.intro} id="academia">
                    <div className={Styles.introIndex}>
                        <span>01 / {english ? 'THE ACADEMY' : 'LA ACADEMIA'}</span>
                        <Scissors size={21} />
                    </div>
                    <div className={Styles.introContent}>
                        <span className={Styles.sectionEyebrow}>ACADEMIA LLONGUERAS ARGENTINA</span>
                        <h2>{english ? <>
                            A school shaped by<br /><em>an international legacy.</em>
                        </> : <>
                            Una escuela con<br /><em>legado internacional.</em>
                        </>}</h2>
                        <p>{english
                            ? 'Llongueras began in Barcelona in 1958 and arrived in Argentina in 1980. In Buenos Aires, its professional academy preserves a way of understanding hairstyling through creativity and technical knowledge.'
                            : 'Llongueras nació en Barcelona en 1958 y llegó a la Argentina en 1980. En Buenos Aires, su academia de formación profesional continúa una manera de entender la peluquería desde la creatividad y el conocimiento técnico.'}</p>
                        <p>{english
                            ? 'The school brings together beginners and experienced professionals, combining practical sessions, technical development and the distinctive Llongueras approach to hair design.'
                            : 'La formación reúne a quienes comienzan y a profesionales que desean perfeccionarse, con prácticas, desarrollo técnico y una mirada personal sobre el diseño del cabello.'}</p>
                        <a className={Styles.editorialLink} href={SOURCES.esteban} target="_blank" rel="noopener noreferrer">
                            {english ? 'Read about the academy’s 2020 relaunch' : 'Conocé la nueva etapa anunciada en 2020'} <ArrowUpRight size={17} />
                        </a>
                    </div>
                    <div className={Styles.introPhoto}>
                        <img src={`${MEDIA_PATH}notebook.webp`} alt={english ? 'Llongueras academy learning materials' : 'Materiales de formación de Academia Llongueras'} loading="lazy" />
                    </div>
                </section>

                {/* Milestones deliberately distinguish the brand's European history from its Argentine school. */}
                <section className={Styles.heritage} id="legado">
                    <div className={Styles.heritageHeading}>
                        <span className={Styles.sectionEyebrow}>02 / {english ? 'A CREATIVE LEGACY' : 'UNA HISTORIA CREATIVA'}</span>
                        <h2>{english ? <>From Barcelona<br /><em>to Buenos Aires.</em></> : <>De Barcelona<br /><em>a Buenos Aires.</em></>}</h2>
                        <p>{english
                            ? 'Key moments in a hairdressing story that crossed borders and inspired generations of professionals.'
                            : 'Los hitos de una historia de peluquería que atravesó fronteras e inspiró a generaciones de profesionales.'}</p>
                    </div>
                    <div className={Styles.timeline}>
                        {HISTORY.map(item => <article className={Styles.milestone} key={item.year}>
                            <span className={Styles.milestoneYear}>{item.year}</span>
                            <div>
                                <h3>{english ? item.titleEn : item.title}</h3>
                                <p>{english ? item.textEn : item.text}</p>
                                <a href={item.source} target="_blank" rel="noopener noreferrer" aria-label={english ? `Source for ${item.year}` : `Fuente de ${item.year}`}>
                                    {english ? 'Source' : 'Fuente'} <ArrowUpRight size={14} />
                                </a>
                            </div>
                        </article>)}
                    </div>
                </section>

                {/* The founder's public biography is clearly distinct from the current academy team. */}
                <section className={Styles.founder}>
                    <div className={Styles.founderContent}>
                        <span className={Styles.sectionEyebrow}>{english ? 'THE FOUNDER' : 'EL CREADOR DE LA MARCA'}</span>
                        <h2>Lluís<br /><em>Llongueras.</em></h2>
                        <span className={Styles.founderDates}>1936 — 2023</span>
                        <p>{english
                            ? 'Hairdresser, photographer, sculptor and an unmistakable creative voice. Lluís Llongueras brought hairdressing closer to the world of art, challenging convention and treating every haircut as a form of personal expression.'
                            : 'Peluquero, fotógrafo, escultor y creador de una mirada inconfundible. Lluís Llongueras acercó el oficio al arte, desafió las convenciones y pensó cada corte como una forma de expresión personal.'}</p>
                        <p>{english
                            ? 'His creative journey included collaborations with Salvador Dalí, the pioneering unisex salon of 1972, international recognition and a training legacy that continues through institutions bearing his name.'
                            : 'Su recorrido incluyó colaboraciones con Salvador Dalí, el salón unisex pionero de 1972, reconocimientos internacionales y un legado formativo que continúa en las instituciones que llevan su nombre.'}</p>
                        <a className={Styles.editorialLink} href={SOURCES.founding} target="_blank" rel="noopener noreferrer">
                            {english ? 'Discover his story' : 'Conocer su trayectoria'} <ArrowUpRight size={17} />
                        </a>
                    </div>
                    <div className={Styles.founderImage}>
                        <img src={`${MEDIA_PATH}banner.webp`} loading="lazy" alt={english ? 'Llongueras brand editorial hairstyle' : 'Imagen editorial de la marca Llongueras'} />
                    </div>
                </section>

                {/* Esteban's public professional role is described without assigning him a sample account. */}
                <section className={Styles.director} id="direccion">
                    <div className={Styles.directorImage}>
                        <img src={`${MEDIA_PATH}group-work.webp`} loading="lazy" alt={english ? 'Technical workshop with professionals at the academy' : 'Capacitación técnica con profesionales en la academia'} />
                        <span>{english ? 'PROFESSIONAL EDUCATION' : 'FORMACIÓN PROFESIONAL'}</span>
                    </div>
                    <div className={Styles.directorContent}>
                        <span className={Styles.sectionEyebrow}>03 / {english ? 'ACADEMIC LEADERSHIP' : 'DIRECCIÓN ACADÉMICA'}</span>
                        <h2>Esteban<br /><em>Tejada.</em></h2>
                        <strong className={Styles.directorRole}>{english ? 'Director of Academia Llongueras Argentina' : 'Director de Academia Llongueras Argentina'}</strong>
                        <p>{english
                            ? 'A prominent figure in the Llongueras story in Latin America, Esteban Tejada helped bring the brand to Argentina in 1980 and has led professional training centered on the Llongueras Method.'
                            : 'Referente de la trayectoria de Llongueras en Latinoamérica, Esteban Tejada impulsó la llegada de la marca a Argentina en 1980 y ha dirigido la formación técnica centrada en el Método Llongueras.'}</p>
                        <p>{english
                            ? 'His activities have included technical instruction in Brazil and educational exchanges with stylists from across the region. The academy’s 2026 communications also identify him as the school’s director.'
                            : 'Su recorrido incluye capacitaciones en Brasil e intercambios con estilistas de la región. Las publicaciones de la propia academia en 2026 lo identifican como su director.'}</p>
                        <div className={Styles.directorLinks}>
                            <a href={SOURCES.academyUpdates} target="_blank" rel="noopener noreferrer">{english ? 'Academy activities' : 'Actividades de la academia'} <ArrowUpRight size={15} /></a>
                            <a href={SOURCES.brazil} target="_blank" rel="noopener noreferrer">{english ? 'Background in Brazil' : 'Trayectoria en Brasil'} <ArrowUpRight size={15} /></a>
                        </div>
                    </div>
                </section>

                <section className={Styles.feature} id="metodo">
                    <div className={Styles.featurePhoto}>
                        <img src={`${MEDIA_PATH}mentor.webp`} alt={english ? 'Live professional cutting demonstration' : 'Demostración profesional de técnicas de corte'} loading="lazy" />
                    </div>
                    <div className={Styles.featureText}>
                        <span className={Styles.sectionEyebrow}>04 / {english ? 'THE LLONGUERAS METHOD' : 'EL MÉTODO LLONGUERAS'}</span>
                        <h2>{english ? <>Technique with<br /><em>a creative purpose.</em></> : <>Técnica con<br /><em>sentido creativo.</em></>}</h2>
                        <p>{english
                            ? 'Developed by Lluís Llongueras, the method approaches cutting through planned sections and projections, working with larger masses of hair rather than traditional strand-by-strand cutting.'
                            : 'Desarrollado por Lluís Llongueras, el método plantea cortes programados mediante particiones y proyecciones, trabajando sobre grandes masas de cabello en lugar del corte tradicional mecha a mecha.'}</p>
                        <p>{english
                            ? 'The school teaches a technical vocabulary of programmed cuts and their elements, while preserving the connection between form, movement and each person’s individual style.'
                            : 'La academia trabaja los elementos de los Cortes Programados y la relación entre forma, movimiento y estilo personal.'}</p>
                        <div className={Styles.featureTags}>
                            <span>01 / {english ? 'STRUCTURE' : 'ESTRUCTURA'}</span>
                            <span>02 / {english ? 'PROJECTION' : 'PROYECCIÓN'}</span>
                            <span>03 / {english ? 'PERSONALIZATION' : 'PERSONALIZACIÓN'}</span>
                        </div>
                        <a className={Styles.editorialLink} href={SOURCES.method} target="_blank" rel="noopener noreferrer">
                            {english ? 'Explore the original method' : 'Explorar el método original'} <ArrowUpRight size={17} />
                        </a>
                    </div>
                </section>

                {/* Historical brand presence is not presented as a current campus footprint. */}
                <section className={Styles.regions} id="presencia">
                    <div className={Styles.regionsHeading}>
                        <span className={Styles.sectionEyebrow}>05 / {english ? 'INTERNATIONAL CONNECTIONS' : 'CONEXIONES INTERNACIONALES'}</span>
                        <h2>{english ? <>A shared language:<br /><em>hair design.</em></> : <>Un mismo lenguaje:<br /><em>la peluquería.</em></>}</h2>
                        <p>{english
                            ? 'Three perspectives on the brand’s history and the Argentine academy’s educational outreach.'
                            : 'Tres perspectivas sobre la historia de la marca y los vínculos educativos de la academia argentina.'}</p>
                    </div>
                    <div className={Styles.regionGrid}>
                        {REGIONS.map(region => <article className={Styles.regionCard} key={region.label}>
                            <img src={`${MEDIA_PATH}${region.image}`} alt={english ? region.headlineEn : region.headline} loading="lazy" />
                            <div className={Styles.regionBody}>
                                <span>{region.number} / {region.label}</span>
                                <h3>{english ? region.headlineEn : region.headline}</h3>
                                <p>{english ? region.descriptionEn : region.description}</p>
                                <a href={region.source} target="_blank" rel="noopener noreferrer">{english ? 'Read source' : 'Leer fuente'} <ArrowUpRight size={15} /></a>
                            </div>
                        </article>)}
                    </div>
                    <p className={Styles.regionNote}>{english
                        ? 'European milestones describe the international brand; the Brazil references describe historical activities and educational representation, not a verified active campus there.'
                        : 'Los hitos europeos corresponden a la marca internacional. Los antecedentes en Brasil describen actividades y representación educativa, no una sede propia actualmente confirmada.'}</p>
                </section>

                {/* Public training data is sourced separately from the role-based campus fixtures. */}
                <section className={Styles.catalog} id="cursos">
                    <div className={Styles.catalogHeader}>
                        <div>
                            <span className={Styles.sectionEyebrow}>06 / {english ? 'PUBLISHED TRAINING AREAS' : 'FORMACIONES PUBLICADAS'}</span>
                            <h2>{english ? <>Build your <em>next chapter.</em></> : <>Elegí tu <em>próximo paso.</em></>}</h2>
                            <p>{english
                                ? 'Explore programs and specialist topics featured in the academy’s public communications. Confirm current dates, tuition and availability directly with the school.'
                                : 'Explorá carreras, módulos y especializaciones difundidos por la academia. Consultá directamente las fechas, los aranceles y la disponibilidad vigente.'}</p>
                        </div>
                        <span className={Styles.catalogCount}>
                            {String(filteredCourses.length).padStart(2, '0')} / {String(TRAINING.length).padStart(2, '0')}
                        </span>
                    </div>
                    <div className={Styles.filters}>
                        <label className={Styles.search}>
                            <Search size={20} />
                            <input
                                type="search"
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder={english ? 'Search training or subjects...' : 'Buscá una formación o técnica...'}
                                aria-label={english ? 'Search training' : 'Buscar formaciones'}
                            />
                        </label>
                        <label>
                            <span>{english ? 'Area' : 'Área'}</span>
                            <select value={category} onChange={event => setCategory(event.target.value)}>
                                {categories.map(item => <option key={item} value={item}>
                                    {categoryLabel(item)}
                                </option>)}
                            </select>
                        </label>
                        <label>
                            <span>{english ? 'Audience' : 'Perfil'}</span>
                            <select value={audience} onChange={event => setAudience(event.target.value)}>
                                <option value="Todos">{english ? 'All levels' : 'Todos los niveles'}</option>
                                <option value="Inicial">{english ? 'Beginners' : 'Inicial'}</option>
                                <option value="Profesional">{english ? 'Professionals' : 'Profesionales'}</option>
                            </select>
                        </label>
                    </div>
                    <div className={Styles.courseGrid}>
                        {filteredCourses.map(course => {
                            const isExpanded = expanded === course.id;
                            return <article key={course.id} className={Styles.courseCard}>
                                <div className={Styles.courseImage}>
                                    <img src={`${MEDIA_PATH}${course.image}`} alt={english ? course.titleEn : course.title} loading="lazy" />
                                    <span>{categoryLabel(course.category)}</span>
                                </div>
                                <div className={Styles.courseBody}>
                                    <div className={Styles.courseMeta}>
                                        <span><BookOpen size={14} />{course.audience === 'Inicial' ? (english ? 'Beginners' : 'Inicial') : course.audience === 'Profesional' ? (english ? 'Professionals' : 'Profesional') : (english ? 'All levels' : 'Todos los niveles')}</span>
                                        <span><Clock3 size={14} />{course.duration ?? (english ? 'Ask for details' : 'A consultar')}</span>
                                    </div>
                                    <h3>{english ? course.titleEn : course.title}</h3>
                                    <p>{english ? course.descriptionEn : course.description}</p>
                                    <button
                                        type="button"
                                        className={Styles.moreButton}
                                        onClick={() => setExpanded(isExpanded ? null : course.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        {isExpanded ? (english ? 'Hide details' : 'Ocultar información') : (english ? 'Learn more' : 'Más información')}
                                        <ArrowUpRight size={17} />
                                    </button>
                                    {isExpanded && <div className={Styles.courseDetails}>
                                        <p>{english
                                            ? 'This training area has appeared in public communications from the academy. Current enrolment, schedules and fees require confirmation.'
                                            : 'Esta formación aparece en comunicaciones públicas de la academia. Las inscripciones, fechas y aranceles actuales se consultan directamente.'}</p>
                                        <a href={course.source} target="_blank" rel="noopener noreferrer">{english ? 'Published information' : 'Publicación de referencia'} <ArrowUpRight size={15} /></a>
                                        <a href={ACADEMY_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">{english ? 'Ask the academy' : 'Consultar a la academia'} <ArrowUpRight size={15} /></a>
                                    </div>}
                                </div>
                            </article>;
                        })}
                    </div>
                    {filteredCourses.length === 0 && <div className={Styles.empty}>
                        <Sparkles size={25} />
                        <h3>{english ? 'No matching training' : 'No encontramos formaciones'}</h3>
                        <p>{english ? 'Try another keyword or clear your filters.' : 'Probá otra búsqueda o cambiá los filtros.'}</p>
                        <button type="button" onClick={clearFilters}>{english ? 'Clear filters' : 'Limpiar filtros'}</button>
                    </div>}
                </section>

                <section className={Styles.statement}>
                    <span>LLONGUERAS / ACADEMIA ARGENTINA</span>
                    <h2>{english ? <>
                        A craft passed forward.<br /><em>A style made your own.</em>
                    </> : <>
                        Un oficio que se transmite.<br /><em>Un estilo que se descubre.</em>
                    </>}</h2>
                    <img src={`${MEDIA_PATH}creative-session.webp`} alt={english ? 'Styling workshop' : 'Sesión de formación de estilismo'} loading="lazy" />
                </section>

                {/* Original academy photos remain grouped in equal-height rows. */}
                <section className={Styles.gallery} id="galeria">
                    <div className={Styles.galleryHeading}>
                        <div>
                            <span className={Styles.sectionEyebrow}>07 / {english ? 'LIFE AT THE ACADEMY' : 'LA VIDA EN LA ACADEMIA'}</span>
                            <h2>{english ? <>Moments that <em>inspire.</em></> : <>Momentos que <em>inspiran.</em></>}</h2>
                        </div>
                        <p>{english ? 'Classes, hands-on practice and shared creative experiences.' : 'Clases, práctica profesional y experiencias creativas compartidas.'}</p>
                    </div>
                    <div className={Styles.galleryGrid}>
                        {GALLERY.map((item, index) => <figure key={item.src} className={Styles.galleryItem}>
                            <img src={`${MEDIA_PATH}${item.src}`} alt={english ? item.titleEn : item.title} loading="lazy" />
                            <figcaption><span>0{index + 1}</span>{english ? item.titleEn : item.title}</figcaption>
                        </figure>)}
                    </div>
                </section>

                {/* Real public contact information belongs to the academy, not a test account. */}
                <section className={Styles.contact} id="contacto">
                    <div className={Styles.contactIntro}>
                        <span className={Styles.sectionEyebrow}>08 / {english ? 'CONTACT THE ACADEMY' : 'CONTACTO CON LA ACADEMIA'}</span>
                        <h2>{english ? <>Let’s talk about<br /><em>your next step.</em></> : <>Tu próximo paso<br /><em>empieza acá.</em></>}</h2>
                        <p>{english
                            ? 'Ask about the academy’s current programs, admission requirements, dates and fees.'
                            : 'Consultá por los programas vigentes, los requisitos de ingreso, las fechas y los aranceles directamente con la academia.'}</p>
                    </div>
                    <div className={Styles.contactDetails}>
                        <div><MapPin size={20} /><span><strong>{english ? 'Buenos Aires headquarters' : 'Sede Buenos Aires'}</strong>{ACADEMY_CONTACT.address}</span></div>
                        <div><Phone size={20} /><span><strong>{english ? 'Phone / WhatsApp' : 'Teléfono / WhatsApp'}</strong><a href={ACADEMY_CONTACT.phoneLink}>{ACADEMY_CONTACT.phone}</a></span></div>
                        <a className={Styles.contactAction} href={ACADEMY_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
                            {english ? 'Contact the academy' : 'Escribir a la academia'} <ArrowUpRight size={18} />
                        </a>
                        <a className={Styles.contactMap} href={ACADEMY_CONTACT.maps} target="_blank" rel="noopener noreferrer">
                            {english ? 'View location on Google Maps' : 'Ver ubicación en Google Maps'} <ArrowUpRight size={15} />
                        </a>
                    </div>
                </section>

                <section className={Styles.cta}>
                    <span className={Styles.sectionEyebrow}>09 / CAMPUS DIGITAL</span>
                    <h2>{english ? <>Your academic space,<br /><em>all in one place.</em></> : <>Tu espacio académico,<br /><em>todo en un lugar.</em></>}</h2>
                    <p>{english
                        ? 'Explore academic and administrative campus features with an authorized account.'
                        : 'Explorá las funciones académicas y administrativas del campus con una cuenta autorizada.'}</p>
                    <Link to="/login" className={Styles.primaryButton}>
                        {english ? 'Explore the campus' : 'Conocer el campus'} <ArrowRight size={18} />
                    </Link>
                    <span className={Styles.campusCaveat}><Check size={14} />{english ? 'Some campus sections contain illustrative information.' : 'Algunas secciones del campus contienen información ilustrativa.'}</span>
                </section>
            </main>

            <footer className={Styles.footer}>
                <Link to="/" aria-label="Academia Llongueras, inicio"><img src={`${MEDIA_PATH}llongueras-logo.png`} alt="Academia Llongueras" /></Link>
                <div className={Styles.footerInfo}>
                    <p>{english ? 'Independent presentation based on public institutional information.' : 'Presentación independiente elaborada a partir de información institucional pública.'}</p>
                    <p className={Styles.developerCredit}>
                        © {new Date().getFullYear()} Academia Llongueras · {english ? 'Developed by Pablo Gilabert, founder of ' : 'Desarrollado por Pablo Gilabert, fundador de '}
                        <a href="https://pg-labs.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="PG Labs — Portfolio">PG Labs</a>
                    </p>
                    <div className={Styles.footerSources}>
                        <a href={SOURCES.academyUpdates} target="_blank" rel="noopener noreferrer">{english ? 'Academy news' : 'Novedades de la academia'}</a>
                        <a href={SOURCES.argentinaHistory} target="_blank" rel="noopener noreferrer">{english ? 'Brand history' : 'Historia de la marca'}</a>
                        <a href={SOURCES.method} target="_blank" rel="noopener noreferrer">{english ? 'The method' : 'El método'}</a>
                    </div>
                </div>
                <a href="#top" onClick={event => {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>
                    ↑ {english ? 'Back to top' : 'Volver arriba'}
                </a>
            </footer>
            <Link to="/login" className={Styles.floatingPortal} aria-label={english ? 'Enter the campus' : 'Ingresar al campus'}>
                <GraduationCap size={21} />
                <span>Campus</span>
                <ArrowUpRight size={14} />
            </Link>
        </div>
    );
}
