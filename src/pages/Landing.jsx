import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { content } from '../data/landingContent';

const team = [
    { id: '01', name: 'Jostin Campos Cortés' },
    { id: '02', name: 'Ian Mora Nuñez' },
    { id: '03', name: 'Estrella Medrano Caceres' },
    { id: '04', name: 'Imanol Monge Acevedo' },
];

export default function Landing() {
    const { language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const t = content[language];

    return (
        <div className="landing">
            <header className="landing-header">
                <nav className="landing-nav wrap">
                    <div className="brand mono"><span className="caret">&gt;_</span> Consultolocos</div>

                    <div className="landing-navlinks">
                        <a href="#servicios">{t.nav.services}</a>
                        <a href="#metodologia">{t.nav.methodology}</a>
                        <a href="#equipo">{t.nav.team}</a>
                        <a href="#contacto">{t.nav.contact}</a>
                    </div>

                    <div className="landing-actions">
                        <div className="landing-status mono">
                            <span className="led"></span> {t.status}
                        </div>

                        <button
                            className="theme-toggle-nav"
                            onClick={toggleTheme}
                            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        >
                            {theme === 'dark' ? '☀' : '☾'}
                        </button>

                        <div className="lang-toggle">
                            <button
                                className={`lang-btn ${language === 'es' ? 'active' : ''}`}
                                onClick={() => setLanguage('es')}
                                aria-label="Español"
                                title="Español"
                            >
                                <img src="https://flagcdn.com/24x18/es.png" alt="Español" width="20" height="15" />
                            </button>
                            <button
                                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                                onClick={() => setLanguage('en')}
                                aria-label="English"
                                title="English"
                            >
                                <img src="https://flagcdn.com/24x18/us.png" alt="English" width="20" height="15" />
                            </button>
                        </div>
                        <Link to="/demo" className="btn-ghost mono">{t.demoBtn}</Link>
                        <Link to="/login" className="btn-login mono">{t.loginBtn}</Link>
                    </div>
                </nav>
            </header>

            <section className="landing-hero">
                <div className="wrap">
                    <div className="badge"><span className="dot"></span> {t.hero.badge}</div>
                    <h1>
                        {t.hero.title1} <span className="hl-violet">{t.hero.highlight1}</span>,<br />
                        {t.hero.title2} <span className="hl-green">{t.hero.highlight2}</span>.
                    </h1>
                    <p className="lead">{t.hero.lead}</p>
                    <div className="cta-row">
                        <a className="btn btn-primary mono" href="#servicios">{t.hero.ctaPrimary}</a>
                        <a className="btn btn-ghost mono" href="#servicios">{t.hero.ctaSecondary}</a>
                        <Link className="btn btn-ghost mono" to="/demo">{t.demoBtn} →</Link>
                    </div>

                    <div className="editor">
                        <div className="editor-tabs">
                            <div className="tab active mono"><span className="filedot"></span>{t.hero.editorTab}</div>
                        </div>
                        <div className="editor-body mono">
                            <div className="gutter">
                                {t.hero.editorLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                            </div>
                            <div className="code">
                                {t.hero.editorLines.map((line, i) => <div key={i}>{line}</div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="servicios" className="landing-section">
                <div className="wrap">
                    <div className="section-head">
                        <div>
                            <span className="tag mono">{t.services.tag}</span>
                            <h2>{t.services.title}</h2>
                        </div>
                        <span className="section-num mono">{t.services.count(t.services.items.length)}</span>
                    </div>

                    <div className="services-grid">
                        {t.services.items.map((s) => (
                            <div key={s.idx} className="service-card">
                                <span className="idx mono">{s.idx}</span>
                                <h3>{s.title}</h3>
                                <p>{s.description}</p>
                            </div>
                        ))}
                        <div className="service-card service-card-placeholder">
                            <span className="idx mono">+</span>
                            <h3>{t.services.moreTitle}</h3>
                            <p>{t.services.moreDescription}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="metodologia" className="landing-section">
                <div className="wrap">
                    <div className="section-head">
                        <div>
                            <span className="tag mono">{t.methodology.tag}</span>
                            <h2>{t.methodology.title}</h2>
                        </div>
                        <span className="section-num mono">{t.methodology.count(t.methodology.steps.length)}</span>
                    </div>

                    <div className="approach-list">
                        {t.methodology.steps.map((s) => (
                            <div key={s.step} className="approach-item">
                                <span className="step mono">{s.step}</span>
                                <div>
                                    <h4>{s.title}</h4>
                                    <p>{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="equipo" className="landing-section">
                <div className="wrap">
                    <div className="section-head">
                        <div>
                            <span className="tag mono">{t.about.tag}</span>
                            <h2>{t.about.title}</h2>
                        </div>
                    </div>
                    <p className="about-lead">{t.about.lead}</p>

                    <div className="team-grid">
                        {team.map((m) => (
                            <div key={m.id} className="member">
                                <div className="avatar mono">{m.id}</div>
                                <h4>{m.name}</h4>
                                <span className="mono">{t.about.membersLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer id="contacto" className="landing-footer">
                <div className="wrap">
                    <div className="brand mono" style={{ justifyContent: 'center', display: 'flex', marginBottom: 16 }}>
                        <span className="caret">&gt;_</span> Consultolocos
                    </div>
                    <p>
                        {t.footer.text}<br />
                        {t.footer.contactLabel}{' '}
                        <a className="tg" href={t.footer.contactUrl} target="_blank" rel="noreferrer">
                            {t.footer.contactLinkText}
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}