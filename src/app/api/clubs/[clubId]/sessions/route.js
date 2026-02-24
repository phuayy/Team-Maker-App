import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/authHelpers';
import { extractSheetId } from '@/lib/sheets';

// POST /api/clubs/[clubId]/sessions — create session (admin+)
export async function POST(req, { params }) {
    try {
        const { clubId } = await params;
        await requireAdmin(clubId);

        const { name, sheetUrl, numTeams, maxTeamMembers } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Session name is required' }, { status: 400 });
        }

        const teamsCount = Math.max(2, Math.min(20, numTeams || 2));
        const maxMembers = Math.max(2, Math.min(20, maxTeamMembers || 8));
        const sheetId = sheetUrl ? extractSheetId(sheetUrl) : null;

        const session = await prisma.session.create({
            data: {
                clubId,
                name: name.trim(),
                sheetUrl: sheetUrl || null,
                sheetId,
                numTeams: teamsCount,
                maxTeamMembers: maxMembers,
                status: 'DRAFT',
            },
        });

        // Auto-create teams
        const teamData = [];
        for (let i = 0; i < teamsCount; i++) {
            teamData.push({
                sessionId: session.id,
                name: `Team ${i + 1}`,
                orderNum: i,
            });
        }
        await prisma.team.createMany({ data: teamData });

        return NextResponse.json({ session }, { status: 201 });
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
