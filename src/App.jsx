import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import Analytics from "./pages/Analytics";
import Records from "./pages/Records";
import Auth from "./pages/Auth";
import { useAuthStore } from "./store/useAuthStore";
import { useMoneyStore } from "./store/useMoneyStore";

const App = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const syncRecordsForUser = useMoneyStore((state) => state.syncRecordsForUser);

  useEffect(() => {
    syncRecordsForUser(currentUser?.id || null);
  }, [currentUser?.id, syncRecordsForUser]);

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <AppShell currentUser={currentUser}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/xarajatlar" element={<Records />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

export default App;
