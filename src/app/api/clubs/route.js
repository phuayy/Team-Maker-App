import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/clubs — list clubs the current user belongs to
export async function GET() {
    try {
        const session = await auth();
        console.log('[GET /api/clubs] session.user:', JSON.stringify(session?.user));
        if (!session?.user?.id) {
            console.log('[GET /api/clubs] No user ID found, returning empty clubs');
            return NextResponse.json({ clubs: [] });
        }

        const clubs = await prisma.club.findMany({
            where: {
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } },
                ],
            },
            include: {
                owner: { select: { name: true, email: true, image: true } },
                _count: { select: { sessions: true, members: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log('[GET /api/clubs] Found clubs:', clubs.length);
        return NextResponse.json({ clubs });
    } catch (error) {
        console.error('[GET /api/clubs] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/clubs — create a new club
export async function POST(req) {
    try {
        const session = await auth();
        console.log('[POST /api/clubs] session.user:', JSON.stringify(session?.user));
        if (!session?.user?.id) {
            console.log('[POST /api/clubs] No user ID — returning 401');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Club name is required' }, { status: 400 });
        }

        // Check for duplicate club name (case-insensitive) for this owner
        const existing = await prisma.club.findFirst({
            where: {
                ownerId: session.user.id,
                name: { equals: name.trim(), mode: 'insensitive' },
            },
        });
        if (existing) {
            return NextResponse.json(
                { error: `A club named "${existing.name}" already exists` },
                { status: 409 }
            );
        }

        const club = await prisma.club.create({
            data: {
                name: name.trim(),
                ownerId: session.user.id,
            },
        });

        console.log('[POST /api/clubs] Created club:', club.id, 'for user:', session.user.id);
        return NextResponse.json({ club }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/clubs] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
