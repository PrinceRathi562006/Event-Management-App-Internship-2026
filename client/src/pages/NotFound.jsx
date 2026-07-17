import { Link } from "react-router-dom";
import CinematicHeroBackground from "../components/features/CinematicHeroBackground";
import Container from "../components/ui/Container";

function NotFound() {
  return (
    <section className="section-content page-top scene-page">
      <CinematicHeroBackground className="scene-page-background" variant="notFound" />
      <Container className="not-found">
        <h1>Page not found</h1>
        <Link className="primary-button" to="/">
          Go home
        </Link>
      </Container>
    </section>
  );
}

export default NotFound;
