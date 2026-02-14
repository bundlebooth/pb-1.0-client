import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';

function PrivacyPolicyPage() {
  return (
    <PageLayout variant="fullWidth" pageClassName="privacy-policy-page" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <Header />
      
      <main style={{ flex: 1, maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Last updated: December 2024
          </p>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              1. Introduction
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Planbeau ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              2. Information We Collect
            </h2>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
              Personal Information
            </h3>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We may collect personal information that you provide directly, including:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials</li>
              <li>Profile information and photos</li>
              <li>Payment information</li>
              <li>Communication history with vendors or clients</li>
              <li>Reviews and feedback</li>
            </ul>

            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
              Automatically Collected Information
            </h3>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We automatically collect certain information when you use our platform:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data</li>
              <li>Usage patterns and preferences</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We use the information we collect to:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Provide and maintain our services</li>
              <li>Process transactions and bookings</li>
              <li>Communicate with you about your account and services</li>
              <li>Personalize your experience</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              4. Information Sharing
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We may share your information with:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li><strong>Vendors and Clients:</strong> To facilitate bookings and communications</li>
              <li><strong>Service Providers:</strong> Third parties who help us operate our platform</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
            </ul>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              5. Data Security
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. However, 
              no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              6. Your Rights
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Depending on your location, you may have the right to:
            </p>
            <ul style={{ color: '#4b5563', lineHeight: '1.7', marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Object to certain processing activities</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              7. Cookies
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We use cookies and similar technologies to enhance your experience, analyze usage, and 
              deliver personalized content. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              8. Children's Privacy
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              Our platform is not intended for children under 18 years of age. We do not knowingly 
              collect personal information from children.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              9. Changes to This Policy
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              10. Contact Us
            </h2>
            <p style={{ color: '#4b5563', lineHeight: '1.7', marginBottom: '1rem' }}>
              If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
              <a href="mailto:privacy@planbeau.com" style={{ color: '#5B68F4' }}>privacy@planbeau.com</a>
            </p>
          </section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <Link to="/terms-of-service" style={{ color: '#5B68F4', fontWeight: '500' }}>
              View Terms of Service →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </PageLayout>
  );
}

export default PrivacyPolicyPage;
