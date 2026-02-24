import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'TeamMaker — Smart Team Assignment',
  description:
    'Automatically create balanced teams from Google Sheets. Skill-based, gender-balanced assignments with real-time updates.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
