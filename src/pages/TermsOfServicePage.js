import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';

function TermsOfServicePage() {
  return (
    <PageLayout variant="fullWidth" pageClassName="terms-of-service-page" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <Header />
      
      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Terms of Service
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Last updated: December 2024
          </p>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              1. Acceptance of Terms
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              By accessing or using Planbeau ("the Platform"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              2. Description of Service
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Planbeau is a platform that connects event planners and clients with vendors who provide 
              event-related services. We facilitate the discovery, communication, and booking process 
              between clients and vendors.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              3. User Accounts
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              To use certain features of the Platform, you must create an account. You are responsible for:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Updating your information to keep it current</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              4. Vendor Responsibilities
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Vendors using the Platform agree to:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Provide accurate descriptions of their services</li>
              <li>Honor all confirmed bookings</li>
              <li>Respond to inquiries in a timely manner</li>
              <li>Maintain appropriate licenses and insurance</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              5. Client Responsibilities
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Clients using the Platform agree to:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Provide accurate event details when making inquiries</li>
              <li>Honor confirmed bookings and payment obligations</li>
              <li>Communicate respectfully with vendors</li>
              <li>Provide honest reviews based on actual experiences</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              6. Payments and Fees
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Payment terms are established between clients and vendors. Planbeau may charge service fees 
              for facilitating transactions. All fees will be clearly disclosed before any transaction is completed.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              7. Cancellation Policy
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Cancellation policies are set by individual vendors and will be displayed on their profiles. 
              Users are encouraged to review these policies before making bookings.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              8. Intellectual Property
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              All content on the Platform, including logos, designs, and software, is the property of 
              Planbeau or its licensors. Users may not copy, modify, or distribute this content without permission.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              9. Limitation of Liability
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Planbeau acts as a platform connecting clients and vendors. We are not responsible for the 
              quality of services provided by vendors or disputes between users. Our liability is limited 
              to the maximum extent permitted by law.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              10. Termination
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We reserve the right to suspend or terminate accounts that violate these terms or engage in 
              fraudulent or harmful behavior.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              11. Changes to Terms
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We may update these Terms of Service from time to time. Continued use of the Platform after 
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              12. Contact Us
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@planbeau.com" style={{ color: '#5B68F4' }}>support@planbeau.com</a>
            </p>
          </section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <Link to="/privacy-policy" style={{ color: '#5B68F4', fontWeight: '500' }}>
              View Privacy Policy →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </PageLayout>
  );
}

export default TermsOfServicePage;
