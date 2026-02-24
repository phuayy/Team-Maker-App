import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClubRole } from '@/lib/authHelpers';
import { auth } from '@/lib/auth';

// GET /api/clubs/[clubId] — get club details
export async function GET(req, { params }) {
    try {
        const { clubId } = await params;
        const session = await auth();
        const role = await getClubRole(clubId);

        const club = await prisma.club.findUnique({
            where: { id: clubId },
            include: {
                owner: { select: { id: true, name: true, email: true, image: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true } },
                    },
                },
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: { select: { players: true, teams: true } },
                    },
                },
            },
        });

        if (!club) {
            return NextResponse.json({ error: 'Club not found' }, { status: 404 });
        }

        return NextResponse.json({ club, role, userId: session?.user?.id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/clubs/[clubId] — update club (owner only)
export async function PATCH(req, { params }) {
    try {
        const { clubId } = await params;
        const role = await getClubRole(clubId);
        if (role !== 'OWNER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { name } = await req.json();
        const club = await prisma.club.update({
            where: { id: clubId },
            data: { name },
        });

        return NextResponse.json({ club });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/clubs/[clubId] — delete club (owner only)
export async function DELETE(req, { params }) {
    try {
        const { clubId } = await params;
        const role = await getClubRole(clubId);
        if (role !== 'OWNER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.club.delete({ where: { id: clubId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
