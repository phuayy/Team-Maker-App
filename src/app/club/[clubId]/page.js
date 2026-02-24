'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Plus, ArrowLeft, Settings, Users, Calendar, Hash,
    Trash2, UserPlus, X, Loader2, ChevronRight
} from 'lucide-react';

export default function ClubPage() {
    const { clubId } = useParams();
    const { data: authSession } = useSession();
    const router = useRouter();
    const [club, setClub] = useState(null);
    const [role, setRole] = useState('GUEST');
    const [loading, setLoading] = useState(true);

    // Create session modal
    const [showCreateSession, setShowCreateSession] = useState(false);
    const [sessionName, setSessionName] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [numTeams, setNumTeams] = useState(4);
    const [maxTeamMembers, setMaxTeamMembers] = useState(8);
    const [creating, setCreating] = useState(false);

    // Admin management
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [adminError, setAdminError] = useState('');

    const fetchClub = useCallback(async () => {
        try {
            const res = await fetch(`/api/clubs/${clubId}`);
            const data = await res.json();
            if (data.error) {
                router.push('/dashboard');
                return;
            }
            setClub(data.club);
            setRole(data.role);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [clubId, router]);

    useEffect(() => {
        fetchClub();
    }, [fetchClub]);

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!sessionName.trim() || creating) return;
        setCreating(true);

        try {
            const res = await fetch(`/api/clubs/${clubId}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: sessionName.trim(),
                    sheetUrl: sheetUrl.trim() || null,
                    numTeams: parseInt(numTeams) || 4,
                    maxTeamMembers: parseInt(maxTeamMembers) || 8,
                }),
            });
            const data = await res.json();
            if (data.session) {
                router.push(`/session/${data.session.id}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim()) return;
        setAdminError('');

        try {
            const res = await fetch(`/api/clubs/${clubId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newAdminEmail.trim() }),
            });
            const data = await res.json();
            if (data.error) {
                setAdminError(data.error);
            } else {
                setNewAdminEmail('');
                fetchClub();
            }
        } catch (err) {
            setAdminError('Failed to add admin');
        }
    };

    const handleRemoveAdmin = async (userId) => {
        if (!confirm('Remove this admin?')) return;
        try {
            await fetch(`/api/clubs/${clubId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            fetchClub();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading" style={{ marginTop: '4rem' }}>
                    <Loader2 size={32} />
                    <p>Loading club...</p>
                </div>
            </div>
        );
    }

    if (!club) return null;

    const isAdmin = role === 'OWNER' || role === 'ADMIN';
    const isOwner = role === 'OWNER';

    return (
        <div className="container">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.5rem' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 className="page-title">{club.name}</h1>
                    <p className="page-subtitle">
                        Owned by {club.owner?.name || club.owner?.email}
                        {role !== 'GUEST' && <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>{role}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isOwner && (
                        <button className="btn btn-outline btn-sm" onClick={() => setShowAdminPanel(!showAdminPanel)}>
                            <Settings size={16} /> Manage Admins
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowCreateSession(true)}>
                            <Plus size={18} /> New Session
                        </button>
                    )}
                </div>
            </div>

            {/* Admin Panel */}
            {showAdminPanel && isOwner && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3><Users size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />Admin Members</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdminPanel(false)}>
                            <X size={16} />
                        </button>
                    </div>
                    <div className="card-body">
                        {/* Add admin form */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                className="input"
                                type="email"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                placeholder="Admin's Google email..."
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleAddAdmin}>
                                <UserPlus size={16} /> Add
                            </button>
                        </div>
                        {adminError && (
                            <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{adminError}</p>
                        )}
                        {/* Admin list */}
                        {club.members?.map((m) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {m.user?.image && <img src={m.user.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.user?.name || m.user?.email}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.user?.email}</div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveAdmin(m.userId)} style={{ color: 'var(--color-danger)' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {(!club.members || club.members.length === 0) && (
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No admins added yet.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value">{club.sessions?.length || 0}</div>
                    <div className="stat-label">Sessions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{(club.members?.length || 0) + 1}</div>
                    <div className="stat-label">Team Members</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{role}</div>
                    <div className="stat-label">Your Role</div>
                </div>
            </div>

            {/* Sessions */}
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>Sessions</h2>
            {(!club.sessions || club.sessions.length === 0) ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No sessions yet</h3>
                    <p>Create a session to start organizing teams.</p>
                </div>
            ) : (
                <div className="grid grid-2">
                    {club.sessions.map((s) => (
                        <Link key={s.id} href={`/session/${s.id}`} className="session-card" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="session-card-title">{s.name}</div>
                                <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : s.status === 'COMPLETED' ? 'badge-accent' : 'badge-primary'}`}>
                                    {s.status}
                                </span>
                            </div>
                            <div className="session-card-meta" style={{ marginTop: '0.5rem' }}>
                                <span><Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />{s._count?.players || 0} players</span>
                                <span><Hash size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />{s._count?.teams || 0} teams</span>
                                <span><Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />{new Date(s.createdAt).toLocaleDateString()}</span>
                            </div>
                            <ChevronRight size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Session Modal */}
            {showCreateSession && (
                <div className="modal-overlay" onClick={() => setShowCreateSession(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Session</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateSession(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateSession}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="label">Session Name</label>
                                    <input
                                        className="input"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                        placeholder="e.g., Saturday Pickup Game"
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Google Sheet URL (optional)</label>
                                    <input
                                        className="input"
                                        value={sheetUrl}
                                        onChange={(e) => setSheetUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                    />
                                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                        Paste the URL of your Google Form responses sheet. Make sure the sheet is shared with your service account.
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label className="label">Number of Teams</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={numTeams}
                                        onChange={(e) => setNumTeams(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Max Players per Team</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={maxTeamMembers}
                                        onChange={(e) => setMaxTeamMembers(e.target.value)}
                                    />
                                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                        Session cap: {(parseInt(numTeams) || 4) * (parseInt(maxTeamMembers) || 8)} players (overflow goes to waiting list)
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateSession(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!sessionName.trim() || creating}>
                                    {creating ? <Loader2 size={16} /> : <Plus size={16} />}
                                    Create Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
