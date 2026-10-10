import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import T from '../theme';

// Honest, minimal support/legal pages. The Terms text below is a plain-language
// summary of how the platform works — the operator should replace it with
// counsel-reviewed terms before public launch.
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';

function Shell({ title, intro, children }) {
  return (
    <div>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 20px 48px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: T.green }}>{title}</h1>
        {intro && <p style={{ margin: '0 0 22px', color: T.muted, fontSize: 14, lineHeight: 1.6 }}>{intro}</p>}
        {children}
      </div>
      <Footer />
    </div>
  );
}
const H = ({ children }) => <h3 style={{ margin: '22px 0 6px', fontSize: 15, fontWeight: 800, color: T.green }}>{children}</h3>;
const P = ({ children }) => <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.7, color: T.text }}>{children}</p>;

export function HelpPage() {
  const navigate = useNavigate();
  return (
    <Shell title="Help Center" intro="The basics of trading on AgriConnect.">
      <H>Buying</H>
      <P>Browse the marketplace, open a listing, and send an offer or ask the seller a question. If the seller counters, you can accept or decline the counter price from your dashboard. Once an offer is accepted an order is created.</P>
      <H>Selling</H>
      <P>Register as a seller, complete KYC, and create a listing. New listings are reviewed by our team before they appear in the marketplace.</P>
      <H>Quality testing, transport and storage</H>
      <P>Book a lab from the <a href="/testing" onClick={e => { e.preventDefault(); navigate('/testing'); }}>Testing</a> page, request a quote from a transporter on the <a href="/transport" onClick={e => { e.preventDefault(); navigate('/transport'); }}>Transport</a> page, and store goods in a verified <a href="/warehouse" onClick={e => { e.preventDefault(); navigate('/warehouse'); }}>warehouse</a>. Prices for transport are set by the provider's quote; you accept it before anything is booked.</P>
      <H>Notifications</H>
      <P>Offers, orders, bookings, quotes and KYC updates appear in the bell at the top of the page.</P>
      <H>Still stuck?</H>
      <P>See <a href="/contact" onClick={e => { e.preventDefault(); navigate('/contact'); }}>Contact Us</a>.</P>
    </Shell>
  );
}

export function DisputesPage() {
  return (
    <Shell title="Dispute Resolution" intro="What to do when an order doesn't go as agreed.">
      <H>1. Raise it on the order</H>
      <P>Open the order from your dashboard and use the dispute option, describing what went wrong. The other party is notified.</P>
      <H>2. Platform review</H>
      <P>An administrator reviews the order history, messages and any documents attached, and records a resolution. Every resolution is logged.</P>
      <H>3. Outcome</H>
      <P>The resolution is shown on the order and both parties are notified. AgriConnect is a marketplace; payment between buyer and seller happens outside the platform, so a resolution is a platform decision on the order status, not a bank transfer.</P>
    </Shell>
  );
}

export function ContactPage() {
  return (
    <Shell title="Contact Us" intro="We're a small team based in Lahore, Punjab.">
      {SUPPORT_EMAIL
        ? <P>Email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</P>
        : <P>For account, order or listing issues, please use the dispute option on the order, or the message thread on the relevant offer or booking — it reaches the right person with the full context.</P>}
      <P>For KYC questions, check the status and notes on your Account page.</P>
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell title="Terms of Use" intro="A plain-language summary of how the platform works.">
      <H>Who can use it</H>
      <P>Sellers, buyers and service providers must register and complete identity (KYC) verification before listing or transacting.</P>
      <H>Listings and trades</H>
      <P>Sellers are responsible for the accuracy of their listings, including quantity and quality details. Offers and orders are agreements between buyer and seller.</P>
      <H>Fees</H>
      <P>The platform fee, where applicable, is shown on the order before you confirm it.</P>
      <H>Service providers</H>
      <P>Labs, transporters and warehouses are independent businesses. Their prices and terms are theirs; a quote you accept is binding on the terms shown.</P>
      <H>Conduct</H>
      <P>Fraudulent listings, false documents or abuse of other users may lead to removal and account suspension.</P>
      <P style={{ color: T.muted }}>This summary is not a substitute for the full legal terms.</P>
    </Shell>
  );
}
