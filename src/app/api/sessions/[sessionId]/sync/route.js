import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClubRole } from '@/lib/authHelpers';
import { fetchSheetData, extractSheetId } from '@/lib/sheets';

// POST /api/sessions/[sessionId]/sync — sync players from Google Sheet
// Supports ?autoAssign=true to also auto-assign new ACTIVE players to teams
export async function POST(req, { params }) {
    try {
        const { sessionId } = await params;
        const url = new URL(req.url);
        const autoAssign = url.searchParams.get('autoAssign') === 'true';

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: {
                clubId: true,
                sheetId: true,
                sheetUrl: true,
                numTeams: true,
                maxTeamMembers: true,
                autoSync: true,
            },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // For auto-sync polling, skip auth check (the session itself controls access)
        // For manual sync, require admin role
        if (!autoAssign) {
            const role = await getClubRole(session.clubId);
            if (role !== 'OWNER' && role !== 'ADMIN') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const sheetId = session.sheetId || extractSheetId(session.sheetUrl);
        if (!sheetId) {
            return NextResponse.json(
                { error: 'No Google Sheet linked to this session' },
                { status: 400 }
            );
        }

        // Calculate session cap
        const sessionCap = session.numTeams * session.maxTeamMembers;

        // Fetch rows from Google Sheet
        const sheetPlayers = await fetchSheetData(sheetId);

        // Get existing players by sheetRow for diffing
        const existingPlayers = await prisma.player.findMany({
            where: { sessionId },
            select: { sheetRow: true, name: true, status: true },
        });

        const existingRows = new Set(existingPlayers.map((p) => p.sheetRow));
        const existingNames = new Set(
            existingPlayers.map((p) => p.name.toLowerCase())
        );

        // Insert only new players
        const newPlayers = sheetPlayers.filter(
            (p) =>
                !existingRows.has(p.rowIndex) &&
                !existingNames.has(p.name.toLowerCase())
        );

        if (newPlayers.length > 0) {
            // Count existing active players to know where we stand vs the cap
            const existingActiveCount = existingPlayers.filter(
                (p) => p.status === 'ACTIVE'
            ).length;

            // Sort new players by sheet row (Google Sheet order) to respect FIFO
            const sortedNewPlayers = [...newPlayers].sort(
                (a, b) => a.rowIndex - b.rowIndex
            );

            let activeSlots = Math.max(0, sessionCap - existingActiveCount);

            await prisma.player.createMany({
                data: sortedNewPlayers.map((p) => {
                    const status = activeSlots > 0 ? 'ACTIVE' : 'WAITLIST';
                    if (activeSlots > 0) activeSlots--;

                    return {
                        sessionId,
                        name: p.name,
                        gender: p.gender,
                        uniqueTeamId: p.uniqueTeamId || null,
                        sheetRow: p.rowIndex,
                        skillLevel: 3,
                        status,
                    };
                }),
            });
        }

        // Re-check all existing players' statuses based on sheet order
        const allPlayers = await prisma.player.findMany({
            where: { sessionId },
            orderBy: { sheetRow: 'asc' },
            select: { id: true, sheetRow: true, status: true, teamId: true },
        });

        const statusUpdates = [];
        let activeCount = 0;

        for (const player of allPlayers) {
            const shouldBeActive = activeCount < sessionCap;
            const newStatus = shouldBeActive ? 'ACTIVE' : 'WAITLIST';

            if (shouldBeActive) activeCount++;

            if (player.status !== newStatus) {
                statusUpdates.push(
                    prisma.player.update({
                        where: { id: player.id },
                        data: {
                            status: newStatus,
                            ...(newStatus === 'WAITLIST' && player.teamId
                                ? { teamId: null }
                                : {}),
                        },
                    })
                );
            }
        }

        if (statusUpdates.length > 0) {
            await prisma.$transaction(statusUpdates);
        }

        // Auto-assign: if enabled and there are new ACTIVE players without a team,
        // assign them to the team with the fewest players (that still has capacity)
        let autoAssigned = 0;
        if (autoAssign && newPlayers.length > 0) {
            // Get teams with their current player counts
            const teams = await prisma.team.findMany({
                where: { sessionId },
                orderBy: { orderNum: 'asc' },
                include: {
                    _count: { select: { players: { where: { status: 'ACTIVE' } } } },
                },
            });

            // Get unassigned ACTIVE players (no team)
            const unassignedActive = await prisma.player.findMany({
                where: { sessionId, status: 'ACTIVE', teamId: null },
                orderBy: { sheetRow: 'asc' },
            });

            // Only auto-assign if there are no waitlisted players
            // (respect FIFO — don't skip waitlisted players)
            const waitlistCount = allPlayers.filter(
                (p, idx) => idx >= sessionCap
            ).length;

            if (waitlistCount === 0 && unassignedActive.length > 0) {
                const teamPlayerCounts = teams.map((t) => ({
                    id: t.id,
                    count: t._count.players,
                }));

                const assignments = [];
                for (const player of unassignedActive) {
                    // Find team with fewest players that still has capacity
                    teamPlayerCounts.sort((a, b) => a.count - b.count);
                    const bestTeam = teamPlayerCounts.find(
                        (t) => t.count < session.maxTeamMembers
                    );

                    if (bestTeam) {
                        assignments.push(
                            prisma.player.update({
                                where: { id: player.id },
                                data: { teamId: bestTeam.id },
                            })
                        );
                        bestTeam.count++;
                        autoAssigned++;
                    }
                }

                if (assignments.length > 0) {
                    await prisma.$transaction(assignments);
                }
            }
        }

        return NextResponse.json({
            synced: newPlayers.length,
            total: sheetPlayers.length,
            active: Math.min(allPlayers.length, sessionCap),
            waitlisted: Math.max(0, allPlayers.length - sessionCap),
            autoAssigned,
            sessionCap,
            message: newPlayers.length > 0
                ? `${newPlayers.length} new player(s) added.${autoAssigned > 0 ? ` ${autoAssigned} auto-assigned to teams.` : ''} ${Math.max(0, allPlayers.length - sessionCap)} on waiting list.`
                : 'No new players found.',
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
