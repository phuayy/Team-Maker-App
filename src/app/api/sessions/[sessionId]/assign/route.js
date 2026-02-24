import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClubRole } from '@/lib/authHelpers';
import { assignPlayersToTeams } from '@/lib/teamAssigner';

// POST /api/sessions/[sessionId]/assign — auto-assign players to teams
export async function POST(req, { params }) {
    try {
        const { sessionId } = await params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { clubId: true, maxTeamMembers: true },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const role = await getClubRole(session.clubId);
        if (role !== 'OWNER' && role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get all teams and only ACTIVE players for this session
        const teams = await prisma.team.findMany({
            where: { sessionId },
            orderBy: { orderNum: 'asc' },
            include: { players: { where: { status: 'ACTIVE' } } },
        });

        const allPlayers = await prisma.player.findMany({
            where: { sessionId, status: 'ACTIVE' },
        });

        // Run the assignment algorithm with dynamic max team members
        const assignments = assignPlayersToTeams(allPlayers, teams, session.maxTeamMembers);

        // Apply assignments in a transaction
        await prisma.$transaction(
            Object.entries(assignments).map(([playerId, teamId]) =>
                prisma.player.update({
                    where: { id: playerId },
                    data: { teamId },
                })
            )
        );

        // Update session status
        await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'ACTIVE' },
        });

        return NextResponse.json({
            assigned: Object.keys(assignments).length,
            message: `${Object.keys(assignments).length} player(s) assigned to teams.`,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
