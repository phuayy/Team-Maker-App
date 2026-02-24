'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Users, LogIn, LogOut } from 'lucide-react';

export default function Navbar() {
    const { data: session, status } = useSession();

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link href="/" className="navbar-brand">
                    <Users size={24} />
                    <span>TeamMaker</span>
                </Link>

                <div className="navbar-actions">
                    {status === 'loading' ? (
                        <div style={{ width: 36, height: 36 }} />
                    ) : session ? (
                        <>
                            <Link href="/dashboard" className="btn btn-ghost btn-sm">
                                Dashboard
                            </Link>
                            {session.user?.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || 'User'}
                                    className="navbar-avatar"
                                />
                            )}
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="btn btn-ghost btn-sm"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => signIn('google')}
                            className="btn btn-primary btn-sm"
                        >
                            <LogIn size={16} />
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
