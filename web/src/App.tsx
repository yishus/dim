import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { SessionList } from "./components/SessionList";
import { SessionDetail } from "./components/SessionDetail";
import { DebugLogs } from "./components/DebugLogs";
import { fetchLogDates, fetchSessions, type SessionInfo } from "./lib/api";

type View = "session" | "debug";

export function App() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("session");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogDates().then((d) => {
      setDates(d);
      if (d.length > 0) setSelectedDate(d[0]!);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchSessions(selectedDate).then((s) => {
      setSessions(s);
      const ids = Object.keys(s);
      setSelectedSessionId(ids.length > 0 ? ids[0]! : null);
      setLoading(false);
    });
  }, [selectedDate]);

  const selectedSession = selectedSessionId ? sessions[selectedSessionId] : null;

  const sidebar = (
    <SessionList
      dates={dates}
      selectedDate={selectedDate}
      onSelectDate={(d) => {
        setSelectedDate(d);
        setView("session");
      }}
      sessions={sessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={(id) => {
        setSelectedSessionId(id);
        setView("session");
      }}
      onSelectDebug={() => setView("debug")}
      view={view}
    />
  );

  const main = loading ? (
    <div className="flex items-center justify-center h-full text-zinc-500">
      Loading...
    </div>
  ) : view === "debug" && selectedDate ? (
    <DebugLogs date={selectedDate} />
  ) : selectedSession ? (
    <SessionDetail session={selectedSession} />
  ) : (
    <div className="flex items-center justify-center h-full text-zinc-500">
      No sessions found
    </div>
  );

  return <Layout sidebar={sidebar} main={main} />;
}
