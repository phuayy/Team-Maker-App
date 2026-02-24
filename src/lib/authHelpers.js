import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * Get the current authenticated user session or return null.
 */
export async function getSession() {
    return await auth();
}

/**
 * Get club role for the current user.
 * Returns 'OWNER' | 'ADMIN' | 'GUEST'
 */
export async function getClubRole(clubId) {
    const session = await auth();
    if (!session?.user?.id) return 'GUEST';

    // Check if owner
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { ownerId: true },
    });

    if (club?.ownerId === session.user.id) return 'OWNER';

    // Check if admin member
    const membership = await prisma.clubMember.findUnique({
        where: {
            clubId_userId: {
                clubId,
                userId: session.user.id,
            },
        },
    });

    return membership?.role === 'ADMIN' ? 'ADMIN' : 'GUEST';
}

/**
 * Require at least ADMIN level access, returns { session, role } or throws.
 */
export async function requireAdmin(clubId) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    const role = await getClubRole(clubId);
    if (role === 'GUEST') {
        throw new Error('Forbidden: Admin access required');
    }

    return { session, role };
}

/**
 * Require OWNER access, returns { session } or throws.
 */
export async function requireOwner(clubId) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    const role = await getClubRole(clubId);
    if (role !== 'OWNER') {
        throw new Error('Forbidden: Owner access required');
    }

    return { session };
}
