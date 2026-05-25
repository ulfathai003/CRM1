/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAppContext } from './context/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Invoices from './components/Invoices';
import Leads from './components/Leads';
import Logs from './components/Logs';
import Expenditures from './components/Expenditures';
import DocumentGenerator from './components/DocumentGenerator';
import { VmsLogo } from './components/VmsLogo';

export default function App() {
  const { currentUser } = useAppContext();
  const [hash, setHash] = useState(window.location.hash || '#dashboard');

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!currentUser) {
    return (
      <div className="relative min-h-[100dvh] z-0 overflow-hidden">
        <div className="fixed inset-0 flex items-center justify-center opacity-30 z-[-1] pointer-events-none">
           <VmsLogo className="h-[100vh] w-auto mix-blend-multiply opacity-20" />
        </div>
        <Login />
      </div>
    );
  }

  const renderContent = () => {
    const [path, params] = hash.split('?');
    
    switch (path) {
      case '#projects': return <Projects />;
      case '#invoices': return <Invoices />;
      case '#leads': return <Leads />;
      case '#expenditures': return <Expenditures />;
      case '#generator': return <DocumentGenerator />;
      case '#logs': return <Logs />;
      case '#dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="relative min-h-[100dvh] z-0 overflow-hidden">
      <div className="fixed inset-0 flex items-center justify-end opacity-20 z-[-1] pointer-events-none">
         <VmsLogo className="h-[120vh] w-auto translate-x-1/4 opacity-10 md:opacity-20" />
      </div>
      <Layout>
        {renderContent()}
      </Layout>
    </div>
  );
}
