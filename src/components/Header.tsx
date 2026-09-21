import { Link } from 'react-router-dom';

/**
 * No logo. This is the lecturer's page for one day of a UZH Executive
 * Education programme, so it carries the course name in text and no
 * institutional wordmark.
 */
export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">Foundations of AI</span>
          <span className="brand__divider" />
          <span className="brand__course">CAS Gamechanger AI · 26 September 2026</span>
        </Link>
      </div>
    </header>
  );
}
