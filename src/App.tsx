/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lightyellow">
        <div className="text-4xl font-black uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

