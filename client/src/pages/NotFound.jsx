import { Link } from 'react-router-dom';

export default function NotFound() {
  return <main className="standalone-page"><h1>Page not found</h1><p>The requested page does not exist.</p><Link to="/">Back to Dashboard</Link></main>;
}