'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, RefreshCw, Zap, Share2, Trash2, UserMinus, UserPlus,
    Star, Loader2, Users, MoveHorizontal, ToggleRight, ToggleLeft
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';

function SkillStars({ level }) {
    return (
        <div className="player-skill" title={`Skill: ${level}/5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={10}
                    className={`skill-star ${i <= level ? '' : 'empty'}`}
                    fill={i <= level ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
}

function GenderBadge({ gender }) {
    const g = (gender || 'Unknown').toLowerCase();
    const label = g === 'male' ? 'M' : g === 'female' ? 'F' : '?';
    const badgeClass = g === 'male' ? 'badge-male' : g === 'female' ? 'badge-female' : '';
    return <span className={`player-gender badge ${badgeClass}`}>{label}</span>;
}

function PlayerCard({ player, index, canDrag, onPullOut }) {
    return (
        <Draggable draggableId={player.id} index={index} isDragDisabled={!canDrag}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`player-card ${canDrag ? 'draggable' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                >
                    <GenderBadge gender={player.gender} />
                    <span className="player-name">{player.name}</span>
                    <SkillStars level={player.skillLevel || 3} />
                    {player.uniqueTeamId && (
                        <span className="badge badge-accent" style={{ fontSize: '0.6875rem' }}>
                            {player.uniqueTeamId}
                        </span>
                    )}
                    {onPullOut && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPullOut(player.id); }}
                            className="btn-icon"
                            title="Pull out from session"
                            style={{ marginLeft: 'auto', padding: '2px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-danger, #ef4444)', opacity: 0.6, fontSize: '0.75rem' }}
                        >
                            <UserMinus size={14} />
                        </button>
                    )}
                </div>
            )}
        </Draggable>
    );
}

export default function SessionPage() {
    const { sessionId } = useParams();
    const { data: authSession } = useSession();
    const router = useRouter();

    const [sessionData, setSessionData] = useState(null);
    const [waitlist, setWaitlist] = useState([]);
    const [pulledOut, setPulledOut] = useState([]);
    const [role, setRole] = useState('GUEST');
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [toast, setToast] = useState(null);
    const autoSyncIntervalRef = useRef(null);

    const fetchSession = useCallback(async () => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}`);
            const data = await res.json();
            if (data.error) {
                setToast({ type: 'error', message: data.error });
                return;
            }
            setSessionData(data.session);
            setWaitlist(data.waitlist || []);
            setPulledOut(data.pulledOut || []);
            setRole(data.role);
            if (data.session?.autoSync !== undefined) {
                setAutoSyncEnabled(data.session.autoSync);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Real-time updates via Supabase
    useRealtimeSession(sessionId, () => {
        fetchSession();
    });

    // Auto-sync polling
    useEffect(() => {
        if (autoSyncEnabled && sessionData?.sheetId) {
            // Poll every 30 seconds
            autoSyncIntervalRef.current = setInterval(async () => {
                try {
                    const res = await fetch(
                        `/api/sessions/${sessionId}/sync?autoAssign=true`,
                        { method: 'POST' }
                    );
                    const data = await res.json();
                    if (data.synced > 0) {
                        showToast('success', data.message);
                        fetchSession();
                    }
                } catch (err) {
                    console.error('Auto-sync error:', err);
                }
            }, 30000);
        }

        return () => {
            if (autoSyncIntervalRef.current) {
                clearInterval(autoSyncIntervalRef.current);
                autoSyncIntervalRef.current = null;
            }
        };
    }, [autoSyncEnabled, sessionData?.sheetId, sessionId]);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch(
                `/api/sessions/${sessionId}/sync${autoSyncEnabled ? '?autoAssign=true' : ''}`,
                { method: 'POST' }
            );
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                showToast('success', data.message);
                fetchSession();
            }
        } catch (err) {
            showToast('error', 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleToggleAutoSync = async () => {
        const newValue = !autoSyncEnabled;
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoSync: newValue }),
            });
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                setAutoSyncEnabled(newValue);
                showToast('success', data.message);
                if (newValue) {
                    setSyncing(true);
                    try {
                        const syncRes = await fetch(
                            `/api/sessions/${sessionId}/sync?autoAssign=true`,
                            { method: 'POST' }
                        );
                        const syncData = await syncRes.json();
                        if (syncData.synced > 0) {
                            showToast('success', syncData.message);
                        }
                        fetchSession();
                    } finally {
                        setSyncing(false);
                    }
                }
            }
        } catch (err) {
            showToast('error', 'Failed to toggle auto-sync');
        }
    };

    const handleAssign = async () => {
        setAssigning(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/assign`, { method: 'POST' });
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                showToast('success', data.message);
                fetchSession();
            }
        } catch (err) {
            showToast('error', 'Assignment failed');
        } finally {
            setAssigning(false);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/session/${sessionId}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('success', 'Session link copied to clipboard!');
        }).catch(() => {
            showToast('success', `Share URL: ${url}`);
        });
    };

    const handlePullOut = async (playerId) => {
        if (!confirm('Pull this player out of the session?')) return;
        try {
            const res = await fetch(`/api/sessions/${sessionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'pullout' }),
            });
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                showToast('success', data.message);
                fetchSession();
            }
        } catch (err) {
            showToast('error', 'Failed to pull out player');
        }
    };

    const handleRestore = async (playerId) => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, action: 'restore' }),
            });
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                showToast('success', data.message);
                fetchSession();
            }
        } catch (err) {
            showToast('error', 'Failed to restore player');
        }
    };

    const handleDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceTeamId = source.droppableId;
        const destTeamId = destination.droppableId;

        // Find what player is at the destination position (for swap)
        let targetPlayerId = null;
        if (destTeamId !== 'pool') {
            const destTeam = sessionData.teams.find((t) => t.id === destTeamId);
            if (destTeam && destTeam.players[destination.index]) {
                targetPlayerId = destTeam.players[destination.index].id;
            }
        }

        try {
            const body = { playerId: draggableId };

            if (targetPlayerId && targetPlayerId !== draggableId) {
                // Swap two players
                body.targetPlayerId = targetPlayerId;
            } else {
                // Move to team
                body.targetTeamId = destTeamId === 'pool' ? 'unassigned' : destTeamId;
            }

            const res = await fetch(`/api/sessions/${sessionId}/swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                fetchSession();
            }
        } catch (err) {
            showToast('error', 'Swap failed');
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading" style={{ marginTop: '4rem' }}>
                    <Loader2 size={32} />
                    <p>Loading session...</p>
                </div>
            </div>
        );
    }

    if (!sessionData) {
        return (
            <div className="container">
                <div className="empty-state" style={{ marginTop: '4rem' }}>
                    <h3>Session not found</h3>
                    <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
                </div>
            </div>
        );
    }

    const canEdit = role === 'OWNER' || role === 'ADMIN';

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) {
                showToast('error', data.error);
            } else {
                router.push(`/club/${sessionData.clubId}`);
            }
        } catch (err) {
            showToast('error', 'Failed to delete session');
        }
    };

    const allPlayers = [
        ...sessionData.teams.flatMap((t) => t.players),
        ...(sessionData.players || []),
    ];
    const totalPlayers = allPlayers.length + waitlist.length;
    const activePlayers = allPlayers.length;
    const assignedPlayers = sessionData.teams.reduce((sum, t) => sum + t.players.length, 0);
    const sessionCap = sessionData.numTeams * (sessionData.maxTeamMembers || 8);
    const avgSkill = activePlayers > 0
        ? (allPlayers.reduce((sum, p) => sum + (p.skillLevel || 3), 0) / activePlayers).toFixed(1)
        : '0';

    return (
        <DragDropContext onDragEnd={canEdit ? handleDragEnd : () => { }}>
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/club/${sessionData.clubId}`)} style={{ marginBottom: '0.5rem' }}>
                                <ArrowLeft size={16} /> {sessionData.club?.name || 'Back'}
                            </button>
                            <h1 className="page-title">{sessionData.name}</h1>
                            <p className="page-subtitle">
                                <span className={`badge ${sessionData.status === 'ACTIVE' ? 'badge-success' : 'badge-primary'}`}>
                                    {sessionData.status}
                                </span>
                                {!canEdit && <span className="badge" style={{ marginLeft: '0.5rem', background: '#f1f5f9', color: '#64748b' }}>View Only</span>}
                            </p>
                        </div>

                        {/* Action Bar */}
                        <div className="action-bar">
                            <button className="btn btn-outline btn-sm" onClick={handleShare}>
                                <Share2 size={16} /> Share
                            </button>
                            {canEdit && (
                                <>
                                    {sessionData.sheetId && (
                                        <>
                                            <button
                                                className={`btn btn-sm ${autoSyncEnabled ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={handleToggleAutoSync}
                                                title={autoSyncEnabled ? 'Auto-sync is ON (polling every 30s)' : 'Auto-sync is OFF'}
                                            >
                                                {autoSyncEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                {autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync OFF'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncing}>
                                                {syncing ? <Loader2 size={16} /> : <RefreshCw size={16} />}
                                                Sync Sheet
                                            </button>
                                        </>
                                    )}
                                    <button className="btn btn-accent btn-sm" onClick={handleAssign} disabled={assigning}>
                                        {assigning ? <Loader2 size={16} /> : <Zap size={16} />}
                                        Auto Assign
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={handleDelete}
                                        style={{ color: 'var(--color-danger, #ef4444)' }}
                                        title="Delete this session"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-value">{totalPlayers}</div>
                        <div className="stat-label">Total Players</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{activePlayers}/{sessionCap}</div>
                        <div className="stat-label">Active / Cap</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{assignedPlayers}</div>
                        <div className="stat-label">Assigned</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: waitlist.length > 0 ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-muted)' }}>{waitlist.length}</div>
                        <div className="stat-label">Waiting List</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{sessionData.teams.length}</div>
                        <div className="stat-label">Teams</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{avgSkill}</div>
                        <div className="stat-label">Avg Skill</div>
                    </div>
                </div>

                {/* Unassigned Players Pool */}
                {sessionData.players && sessionData.players.length > 0 && (
                    <Droppable droppableId="pool">
                        {(provided, snapshot) => (
                            <div className={`player-pool ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}>
                                <div className="player-pool-header">
                                    <span>
                                        <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                        Unassigned Players ({sessionData.players.length})
                                    </span>
                                    {canEdit && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <MoveHorizontal size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                            Drag to assign
                                        </span>
                                    )}
                                </div>
                                <div className="player-pool-body" ref={provided.innerRef} {...provided.droppableProps}>
                                    {sessionData.players.map((player, index) => (
                                        <PlayerCard key={player.id} player={player} index={index} canDrag={canEdit} onPullOut={canEdit ? handlePullOut : null} />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            </div>
                        )}
                    </Droppable>
                )}

                {/* Teams Grid */}
                <div className="teams-grid">
                    {sessionData.teams.map((team) => {
                        const teamSkill = team.players.length > 0
                            ? (team.players.reduce((s, p) => s + (p.skillLevel || 3), 0) / team.players.length).toFixed(1)
                            : '0';

                        return (
                            <Droppable key={team.id} droppableId={team.id}>
                                {(provided, snapshot) => (
                                    <div className={`team-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}>
                                        <div className="team-header">
                                            <span>{team.name}</span>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>avg {teamSkill}</span>
                                                <span className="team-count">{team.players.length}/{sessionData.maxTeamMembers || 8}</span>
                                            </div>
                                        </div>
                                        <div className="team-players" ref={provided.innerRef} {...provided.droppableProps}>
                                            {team.players.map((player, index) => (
                                                <PlayerCard key={player.id} player={player} index={index} canDrag={canEdit} onPullOut={canEdit ? handlePullOut : null} />
                                            ))}
                                            {team.players.length === 0 && (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                                                    {canEdit ? 'Drop players here' : 'No players'}
                                                </div>
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>

                {/* Waiting List */}
                {waitlist.length > 0 && (
                    <div className="player-pool" style={{ borderColor: 'var(--color-warning, #f59e0b)', background: 'rgba(245, 158, 11, 0.04)' }}>
                        <div className="player-pool-header">
                            <span>
                                <Users size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Waiting List ({waitlist.length})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Players beyond session cap of {sessionCap}
                            </span>
                        </div>
                        <div className="player-pool-body">
                            {waitlist.map((player, index) => (
                                <div key={player.id} className="player-card" style={{ opacity: 0.75 }}>
                                    <span className="badge" style={{ fontSize: '0.625rem', background: 'var(--color-warning, #f59e0b)', color: '#fff', minWidth: '1.5rem', textAlign: 'center' }}>#{index + 1}</span>
                                    <GenderBadge gender={player.gender} />
                                    <span className="player-name">{player.name}</span>
                                    <SkillStars level={player.skillLevel || 3} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toast */}

                {/* Pulled Out */}
                {pulledOut.length > 0 && (
                    <div className="player-pool" style={{ borderColor: 'var(--color-danger, #ef4444)', background: 'rgba(239, 68, 68, 0.04)' }}>
                        <div className="player-pool-header">
                            <span>
                                <UserMinus size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Pulled Out ({pulledOut.length})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Excluded from assignment
                            </span>
                        </div>
                        <div className="player-pool-body">
                            {pulledOut.map((player) => (
                                <div key={player.id} className="player-card" style={{ opacity: 0.5 }}>
                                    <GenderBadge gender={player.gender} />
                                    <span className="player-name" style={{ textDecoration: 'line-through' }}>{player.name}</span>
                                    <SkillStars level={player.skillLevel || 3} />
                                    {canEdit && (
                                        <button
                                            onClick={() => handleRestore(player.id)}
                                            className="btn-icon"
                                            title="Restore player"
                                            style={{ marginLeft: 'auto', padding: '2px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-success, #22c55e)', fontSize: '0.75rem' }}
                                        >
                                            <UserPlus size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {toast && (
                    <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        </DragDropContext>
    );
}
