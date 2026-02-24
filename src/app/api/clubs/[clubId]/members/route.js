import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireOwner } from '@/lib/authHelpers';

// POST /api/clubs/[clubId]/members — add admin member (owner only)
export async function POST(req, { params }) {
    try {
        const { clubId } = await params;
        await requireOwner(clubId);

        const { email } = await req.json();
        if (!email?.trim()) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.trim() },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found. They need to log in at least once first.' },
                { status: 404 }
            );
        }

        // Create membership
        const member = await prisma.clubMember.upsert({
            where: {
                clubId_userId: { clubId, userId: user.id },
            },
            update: { role: 'ADMIN' },
            create: {
                clubId,
                userId: user.id,
                role: 'ADMIN',
            },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
        });

        return NextResponse.json({ member }, { status: 201 });
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

// DELETE /api/clubs/[clubId]/members — remove admin member (owner only)
export async function DELETE(req, { params }) {
    try {
        const { clubId } = await params;
        await requireOwner(clubId);

        const { userId } = await req.json();
        await prisma.clubMember.delete({
            where: {
                clubId_userId: { clubId, userId },
            },
        });

        return NextResponse.json({ success: true });
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
