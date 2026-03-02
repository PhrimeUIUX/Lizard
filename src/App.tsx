import { useMemo, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { PressPanel } from './components/PressPanel';
import { ToastItem, ToastStack } from './components/ToastStack';
import { TopHundredModal } from './components/TopHundredModal';
import { CoffeeModal } from './components/CoffeeModal';
import { supabase } from './lib/supabaseClient';
import { useGameData } from './hooks/useGameData';
import { getOrCreateGuestId } from './lib/guest';
import { NoticeTone } from './types';

export default function App() {
  const [status, setStatus] = useState('Ready to press.');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTopHundredOpen, setIsTopHundredOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isCoffeeModalOpen, setIsCoffeeModalOpen] = useState(false);
  const sessionTapCountRef = useRef<number>(0);
  const coffeeShownThisSessionRef = useRef<boolean>(false);

  const guestId = useMemo(() => getOrCreateGuestId(), []);

  const {
    session,
    publicTotal,
    myScore,
    leaderboard,
    setPublicTotal,
    setMyScore,
    loadLeaderboard
  } = useGameData();

  function notify(tone: NoticeTone, message: string) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, tone, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }

  function openAuthModal(mode: 'signin' | 'signup') {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setStatus('Logged out. You can still press as guest.');
    notify('info', 'Logged out successfully.');
  }

  function handleSuccessfulPress() {
    sessionTapCountRef.current += 1;
    const reachedTapGoal = sessionTapCountRef.current >= 20;

    if (reachedTapGoal && !coffeeShownThisSessionRef.current) {
      coffeeShownThisSessionRef.current = true;
      setIsCoffeeModalOpen(true);
    }
  }

  return (
    <main className="arena-root">
      <header className="site-header">
        <div className="brand-block">
          <p className="eyebrow">Powered by PhrimeUIUX</p>
          <h1>LIZARD LIZARD LIZARD</h1>
        </div>

        <div className="header-actions">
          {session ? (
            <>
              <p className="account-pill">{session.user.email}</p>
              <button
                className="ghost icon-only"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4v-2H6V5h4V3zm7.59 8.59L14 8l1.41-1.41L21.83 13l-6.42 6.41L14 18l3.59-3.59H9v-2h8.59z"
                  />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button className="ghost" onClick={() => openAuthModal('signin')}>Sign in</button>
              <button className="primary" onClick={() => openAuthModal('signup')}>Sign up</button>
            </>
          )}
        </div>
      </header>

      <section className="action-zone">
        <section className="top-lizard-wrap">
          <LeaderboardPanel
            leaderboard={leaderboard}
            onOpenTopHundred={() => setIsTopHundredOpen(true)}
          />
        </section>

        <PressPanel
          session={session}
          guestId={guestId}
          publicTotal={publicTotal}
          myScore={myScore}
          onPublicTotalChange={setPublicTotal}
          onMyScoreChange={setMyScore}
          onStatusChange={setStatus}
          onRefreshLeaderboard={loadLeaderboard}
          onSuccessfulPress={handleSuccessfulPress}
        />
        <p className="status">{status}</p>
      </section>

      <footer className="site-footer">
        <span className="follow-label">Follow me on</span>
        <a
          className="fb-btn"
          href="https://www.facebook.com/Phrimeuniverse/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit PhrimeUIUX on Facebook"
        >
          Facebook
        </a>
      </footer>

      <AuthModal
        mode={authMode}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onStatusChange={setStatus}
        onNotify={notify}
      />

      <TopHundredModal
        isOpen={isTopHundredOpen}
        onClose={() => setIsTopHundredOpen(false)}
      />

      <CoffeeModal
        isOpen={isCoffeeModalOpen}
        onClose={() => setIsCoffeeModalOpen(false)}
      />

      <ToastStack items={toasts} onDismiss={removeToast} />
    </main>
  );
}
