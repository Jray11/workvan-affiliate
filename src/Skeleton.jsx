import React from 'react';

const pulseKeyframes = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
`;

function Bone({ width, height = '1rem', radius = '6px', style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: '#2a2a2a',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #2a2a2a',
      padding: '1.25rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <style>{pulseKeyframes}</style>
      <Bone width="260px" height="1.75rem" style={{ marginBottom: '0.5rem' }} />
      <Bone width="300px" height="1rem" style={{ marginBottom: '2rem' }} />
      {/* Referral link card */}
      <Card style={{ padding: '1.5rem', marginBottom: '2rem', background: '#2a1a0a' }}>
        <Bone width="140px" height="1rem" style={{ marginBottom: '1rem' }} />
        <Bone width="100%" height="2.5rem" radius="8px" style={{ marginBottom: '0.75rem' }} />
        <Bone width="80px" height="2rem" radius="8px" />
      </Card>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <Bone width="80px" height="0.85rem" style={{ marginBottom: '0.75rem' }} />
            <Bone width="60px" height="2rem" />
          </Card>
        ))}
      </div>
      {/* This month */}
      <Card>
        <Bone width="160px" height="1rem" style={{ marginBottom: '0.75rem' }} />
        <Bone width="100px" height="2.5rem" />
      </Card>
    </div>
  );
}

export function LeadsSkeleton() {
  return (
    <div>
      <style>{pulseKeyframes}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Bone width="160px" height="1.75rem" />
        <Bone width="120px" height="2.25rem" radius="8px" />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} style={{ padding: '1rem' }}>
            <Bone width="60px" height="0.75rem" style={{ marginBottom: '0.5rem' }} />
            <Bone width="40px" height="1.5rem" />
          </Card>
        ))}
      </div>
      {/* Search + filters */}
      <Bone width="100%" height="2.5rem" radius="8px" style={{ marginBottom: '1rem' }} />
      {/* Lead cards */}
      {[1, 2, 3].map(i => (
        <Card key={i} style={{ marginBottom: '0.75rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <Bone width="180px" height="1.1rem" />
            <Bone width="70px" height="1.5rem" radius="12px" />
          </div>
          <Bone width="140px" height="0.85rem" style={{ marginBottom: '0.4rem' }} />
          <Bone width="200px" height="0.85rem" />
        </Card>
      ))}
    </div>
  );
}

export function ReferralsSkeleton() {
  return (
    <div>
      <style>{pulseKeyframes}</style>
      <Bone width="140px" height="1.75rem" style={{ marginBottom: '1.5rem' }} />
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <Bone width="100px" height="0.85rem" style={{ marginBottom: '0.75rem' }} />
            <Bone width="40px" height="2rem" />
          </Card>
        ))}
      </div>
      {/* Table rows */}
      <Card style={{ padding: 0 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between' }}>
            <Bone width="160px" height="1rem" />
            <Bone width="60px" height="1.5rem" radius="12px" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function CommissionsSkeleton() {
  return (
    <div>
      <style>{pulseKeyframes}</style>
      <Bone width="160px" height="1.75rem" style={{ marginBottom: '1.5rem' }} />
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <Bone width="100px" height="0.85rem" style={{ marginBottom: '0.75rem' }} />
            <Bone width="80px" height="2rem" />
          </Card>
        ))}
      </div>
      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(i => <Bone key={i} width="60px" height="2rem" radius="8px" />)}
      </div>
      {/* Month groups */}
      {[1, 2].map(i => (
        <Card key={i} style={{ marginBottom: '1rem' }}>
          <Bone width="140px" height="1rem" style={{ marginBottom: '1rem' }} />
          <Bone width="100%" height="0.85rem" style={{ marginBottom: '0.5rem' }} />
          <Bone width="80%" height="0.85rem" />
        </Card>
      ))}
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div>
      <style>{pulseKeyframes}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <Bone width="120px" height="1.75rem" style={{ marginBottom: '0.5rem' }} />
          <Bone width="220px" height="1rem" />
        </div>
        <Bone width="140px" height="2.25rem" radius="8px" />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <Bone width="80px" height="0.85rem" style={{ marginBottom: '0.75rem' }} />
            <Bone width="40px" height="2rem" />
          </Card>
        ))}
      </div>
      {/* Member cards */}
      {[1, 2].map(i => (
        <Card key={i} style={{ marginBottom: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Bone width="45px" height="45px" radius="50%" />
          <div style={{ flex: 1 }}>
            <Bone width="120px" height="1rem" style={{ marginBottom: '0.4rem' }} />
            <Bone width="80px" height="0.85rem" />
          </div>
        </Card>
      ))}
    </div>
  );
}
