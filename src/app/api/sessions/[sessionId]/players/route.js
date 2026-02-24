import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClubRole } from '@/lib/authHelpers';

// PATCH /api/sessions/[sessionId]/players — update a player's skill level
export async function PATCH(req, { params }) {
    try {
        const { sessionId } = await params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { clubId: true },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const role = await getClubRole(session.clubId);
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { playerId, skillLevel } = await req.json();

        if (!playerId) {
            return NextResponse.json({ error: 'playerId required' }, { status: 400 });
        }

        const level = Math.max(1, Math.min(5, skillLevel || 3));

        const player = await prisma.player.update({
            where: { id: playerId },
            data: { skillLevel: level },
        });

        return NextResponse.json({ player });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/sessions/[sessionId]/players — pull out or restore a player
export async function POST(req, { params }) {
    try {
        const { sessionId } = await params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { clubId: true, numTeams: true, maxTeamMembers: true },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const role = await getClubRole(session.clubId);
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { playerId, action } = await req.json();

        if (!playerId || !['pullout', 'restore'].includes(action)) {
            return NextResponse.json({ error: 'playerId and action (pullout/restore) required' }, { status: 400 });
        }

        const player = await prisma.player.findUnique({
            where: { id: playerId },
            select: { id: true, status: true, teamId: true, sessionId: true },
        });

        if (!player || player.sessionId !== sessionId) {
            return NextResponse.json({ error: 'Player not found in this session' }, { status: 404 });
        }

        const sessionCap = session.numTeams * session.maxTeamMembers;

        if (action === 'pullout') {
            // Pull out the player — set status to PULLOUT, unassign from team
            await prisma.player.update({
                where: { id: playerId },
                data: { status: 'PULLOUT', teamId: null },
            });

            // If the pulled-out player was ACTIVE, promote the first WAITLIST player
            if (player.status === 'ACTIVE') {
                const firstWaitlisted = await prisma.player.findFirst({
                    where: { sessionId, status: 'WAITLIST' },
                    orderBy: { sheetRow: 'asc' },
                });

                if (firstWaitlisted) {
                    await prisma.player.update({
                        where: { id: firstWaitlisted.id },
                        data: { status: 'ACTIVE' },
                    });
                }
            }

            return NextResponse.json({
                message: 'Player pulled out from session.',
            });
        } else {
            // Restore — check if there's room in the active pool
            const activeCount = await prisma.player.count({
                where: { sessionId, status: 'ACTIVE' },
            });

            const newStatus = activeCount < sessionCap ? 'ACTIVE' : 'WAITLIST';

            await prisma.player.update({
                where: { id: playerId },
                data: { status: newStatus },
            });

            return NextResponse.json({
                message: `Player restored as ${newStatus}.`,
            });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
