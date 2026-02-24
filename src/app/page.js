'use client';

import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Users, Zap, Shield, Share2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>⚡ TeamMaker</h1>
          <p>
            Automatically create balanced teams from your Google Sheets sign-up forms.
            Skill-based, gender-balanced, and real-time.
          </p>
          <div className="hero-actions">
            {session ? (
              <Link href="/dashboard" className="btn btn-accent btn-lg">
                Go to Dashboard
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                  className="btn btn-accent btn-lg"
                >
                  Get Started
                  <ArrowRight size={18} />
                </button>
                <Link href="#features" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                  Learn More
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container" style={{ padding: '3rem 1.5rem' }}>
        <div className="grid grid-3">
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <Zap size={40} style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Smart Assignment</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Balance teams by skill level and gender automatically, with support for friend group requests.
            </p>
          </div>
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Google Sheets Sync</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Pull players directly from your Google Forms response sheet. New sign-ups sync instantly.
            </p>
          </div>
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <Shield size={40} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Role-Based Access</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Club owners, admins, and guests — each sees only what they need. Share a read-only link with players.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container" style={{ paddingBottom: '3rem' }}>
        <div className="card card-body" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
          <Share2 size={32} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>How It Works</h2>
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>1</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Create a club & session</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>2</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Link your Google Sheet</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>3</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Auto-assign & share!</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
