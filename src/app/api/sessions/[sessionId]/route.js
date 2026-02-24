import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getClubRole } from '@/lib/authHelpers';

// GET /api/sessions/[sessionId] — get full session detail (public)
export async function GET(req, { params }) {
    try {
        const { sessionId } = await params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                club: { select: { id: true, name: true, ownerId: true } },
                teams: {
                    orderBy: { orderNum: 'asc' },
                    include: {
                        players: {
                            where: { status: 'ACTIVE' },
                            orderBy: { name: 'asc' },
                        },
                    },
                },
                players: {
                    where: { teamId: null, status: 'ACTIVE' },
                    orderBy: { sheetRow: 'asc' },
                },
            },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Fetch waitlisted players separately
        const waitlist = await prisma.player.findMany({
            where: { sessionId, status: 'WAITLIST' },
            orderBy: { sheetRow: 'asc' },
        });

        // Fetch pulled-out players
        const pulledOut = await prisma.player.findMany({
            where: { sessionId, status: 'PULLOUT' },
            orderBy: { name: 'asc' },
        });

        // Get user's role for this club
        const userSession = await auth();
        let role = 'GUEST';
        if (userSession?.user?.id) {
            role = await getClubRole(session.clubId);
        }

        return NextResponse.json({ session, waitlist, pulledOut, role });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/sessions/[sessionId] — toggle autoSync
export async function PATCH(req, { params }) {
    try {
        const { sessionId } = await params;
        const { autoSync } = await req.json();

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

        const updated = await prisma.session.update({
            where: { id: sessionId },
            data: { autoSync: !!autoSync },
        });

        return NextResponse.json({
            autoSync: updated.autoSync,
            message: `Auto-sync ${updated.autoSync ? 'enabled' : 'disabled'}.`,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/sessions/[sessionId] — delete session (admin+)
export async function DELETE(req, { params }) {
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

        await prisma.session.delete({ where: { id: sessionId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
