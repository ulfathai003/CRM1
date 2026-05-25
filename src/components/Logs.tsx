import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Shield, Clock, ShieldAlert } from 'lucide-react';

export default function Logs() {
  const { logs, currentUser } = useAppContext();

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert size={48} className="text-luxury-accent mb-6 opacity-80" />
        <h2 className="text-xl luxury-title mb-2">Access Restricted</h2>
        <p className="text-sm font-medium text-luxury-muted tracking-wide">Administrator privileges required to view system logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-light text-luxury-navy tracking-tight mb-2">Activity Monitor</h1>
        <div className="h-1 w-16 bg-luxury-gold opacity-80 rounded-full"></div>
      </header>

      <div className="luxury-card p-0 overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm font-medium text-luxury-muted tracking-wide">No recent activity</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-luxury-border bg-luxury-bg/30">
                  <th className="p-5 text-xs font-medium uppercase tracking-widest text-luxury-muted border-r border-luxury-border/50 w-48">Timestamp</th>
                  <th className="p-5 text-xs font-medium uppercase tracking-widest text-luxury-muted border-r border-luxury-border/50">User</th>
                  <th className="p-5 text-xs font-medium uppercase tracking-widest text-luxury-muted border-r border-luxury-border/50 w-48">Action</th>
                  <th className="p-5 text-xs font-medium uppercase tracking-widest text-luxury-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-luxury-border/30 last:border-b-0 hover:bg-luxury-bg/50 transition-colors">
                    <td className="p-4 border-r border-luxury-border/50 font-mono text-xs text-luxury-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 border-r border-luxury-border/50">
                      <span className="font-medium text-sm text-luxury-navy flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-luxury-bg border border-luxury-border flex items-center justify-center text-[8px] text-luxury-muted">
                          {log.userName.charAt(0)}
                        </div>
                        {log.userName}
                      </span>
                    </td>
                    <td className="p-4 border-r border-luxury-border/50">
                      <span className="text-[9px] font-medium tracking-widest bg-luxury-bg/50 text-luxury-navy px-2.5 py-1 uppercase rounded border border-luxury-border shrink-0">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-luxury-muted max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
