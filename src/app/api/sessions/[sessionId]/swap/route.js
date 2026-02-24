import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClubRole } from '@/lib/authHelpers';

// POST /api/sessions/[sessionId]/swap — swap two players between teams
export async function POST(req, { params }) {
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

        const { playerId, targetTeamId, targetPlayerId } = await req.json();

        if (targetPlayerId) {
            // Swap two players: each goes to the other's team
            const player1 = await prisma.player.findUnique({ where: { id: playerId } });
            const player2 = await prisma.player.findUnique({ where: { id: targetPlayerId } });

            if (!player1 || !player2) {
                return NextResponse.json({ error: 'Player not found' }, { status: 404 });
            }

            await prisma.$transaction([
                prisma.player.update({
                    where: { id: playerId },
                    data: { teamId: player2.teamId },
                }),
                prisma.player.update({
                    where: { id: targetPlayerId },
                    data: { teamId: player1.teamId },
                }),
            ]);

            return NextResponse.json({ success: true, action: 'swapped' });
        } else if (targetTeamId) {
            // Move player to a different team (or to unassigned if null)
            await prisma.player.update({
                where: { id: playerId },
                data: { teamId: targetTeamId === 'unassigned' ? null : targetTeamId },
            });

            return NextResponse.json({ success: true, action: 'moved' });
        } else {
            return NextResponse.json({ error: 'Must provide targetTeamId or targetPlayerId' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
