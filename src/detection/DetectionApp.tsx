import React, { useEffect } from 'react';
import { useDetectionStore } from './stores/detection-store';
import { DetectionDB } from './db/detection-firebase';
import { DetectionSidebar } from './components/layout/DetectionSidebar';
import { DetectionHeader } from './components/layout/DetectionHeader';
import { SessionList } from './components/session/SessionList';
import { SessionCreate } from './components/session/SessionCreate';
import { PlayerRegistry } from './components/players/PlayerRegistry';
import { PlayerQuickAdd } from './components/players/PlayerQuickAdd';
import { TestDashboard } from './components/testing/TestDashboard';
import { ResultsDashboard } from './components/results/ResultsDashboard';

export function DetectionApp() {
  const { setSessions, setPlayers, view, showSessionCreate, showPlayerCreate } = useDetectionStore();

  useEffect(() => {
    const unsubSessions = DetectionDB.onSessions(setSessions);
    const unsubPlayers = DetectionDB.onPlayers(setPlayers);
    return () => {
      unsubSessions();
      unsubPlayers();
    };
  }, [setSessions, setPlayers]);

  function renderView() {
    switch (view) {
      case 'sessions': return <SessionList />;
      case 'players': return <PlayerRegistry />;
      case 'testing': return <TestDashboard />;
      case 'results': return <ResultsDashboard />;
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <DetectionSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DetectionHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{renderView()}</main>
      </div>
      {showSessionCreate && <SessionCreate />}
      {showPlayerCreate && <PlayerQuickAdd />}
    </div>
  );
}
