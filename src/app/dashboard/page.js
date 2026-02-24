'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus,
    Users,
    Calendar,
    ChevronRight,
    Loader2,
} from 'lucide-react';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [clubName, setClubName] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchClubs = useCallback(async () => {
        try {
            const res = await fetch('/api/clubs');
            const data = await res.json();
            setClubs(data.clubs || []);
        } catch (err) {
            console.error('Failed to fetch clubs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            fetchClubs();
        }
    }, [status, router, fetchClubs]);

    const handleCreateClub = async (e) => {
        e.preventDefault();
        if (!clubName.trim() || creating) return;
        setCreating(true);

        try {
            const res = await fetch('/api/clubs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clubName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to create club');
                return;
            }
            if (data.club) {
                setClubs((prev) => [data.club, ...prev]);
                setClubName('');
                setShowCreate(false);
            }
        } catch (err) {
            console.error('Failed to create club:', err);
        } finally {
            setCreating(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="container">
                <div className="loading" style={{ marginTop: '4rem' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">My Clubs</h1>
                    <p className="page-subtitle">Manage your clubs and team sessions</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={18} />
                    New Club
                </button>
            </div>

            {/* Create Club Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create a Club</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateClub}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="label">Club Name</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                        placeholder="e.g., Weekend Badminton Club"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={!clubName.trim() || creating}>
                                    {creating ? <Loader2 size={16} /> : <Plus size={16} />}
                                    Create Club
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Clubs Grid */}
            {clubs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏟️</div>
                    <h3>No clubs yet</h3>
                    <p>Create your first club to start organizing team sessions.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowCreate(true)}>
                        <Plus size={18} />
                        Create Club
                    </button>
                </div>
            ) : (
                <div className="grid grid-3">
                    {clubs.map((club) => (
                        <Link key={club.id} href={`/club/${club.id}`} className="session-card">
                            <div className="session-card-title">
                                <Users size={18} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--color-primary)' }} />
                                {club.name}
                            </div>
                            <div className="session-card-meta">
                                <span>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                    {new Date(club.createdAt).toLocaleDateString()}
                                </span>
                                <span>{club._count?.sessions || 0} sessions</span>
                                <span>{club._count?.members || 0} members</span>
                            </div>
                            <ChevronRight
                                size={20}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
                            />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
