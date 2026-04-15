import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">Kasi<span className="highlight">Market</span></div>
          <p>Find local services. Find local work. Connect with trusted service providers in your community.</p>
        </div>
        <div className="footer-col">
          <h4>For Customers</h4>
          <Link to="/browse">Browse Services</Link>
          <Link to="/create-request">Post a Job Request</Link>
          <Link to="/browse?category=home-cleaning">Home Cleaning</Link>
          <Link to="/browse?category=handyman">Handyman</Link>
        </div>
        <div className="footer-col">
          <h4>For Providers</h4>
          <Link to="/register">Join as Provider</Link>
          <Link to="/create-listing">Post a Service</Link>
          <Link to="/browse?tab=requests">Browse Requests</Link>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <a href="#">About Us</a>
          <a href="#">Contact</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Kasi Market. All rights reserved. Made with ❤️ for local communities.</p>
      </div>
    </footer>
  );
}
