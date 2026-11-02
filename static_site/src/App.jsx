import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import './App.css';
import Navigation from './components/Navigation';
import OverviewPage from './components/OverviewPage';
import FeaturesPage from './components/FeaturesPage';
import RunAgentPage from './components/RunAgentPage';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import ConfirmDialog from './components/ConfirmDialog';
import { useHashRoute } from './hooks/useHashRoute';
import { useRunAnalysis } from './hooks/useRunAnalysis';
import { useTheme } from './hooks/useTheme';
import { deleteAccount } from './utils/api';
import { buildSignOutUrl } from './config/auth';
import { clearGithubToken, getEffectiveSettings, hasCustomSettings, reconcileGithubTokenSubject } from './config/settings';

const ReportModal = lazy(() => import('./components/ReportModal'));

function App() {
    const auth = useAuth();
    const [route, navigate] = useHashRoute();
    const theme = useTheme();
    const run = useRunAnalysis();
    const [showSettings, setShowSettings] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const settings = useMemo(() => getEffectiveSettings(), [showSettings, auth.isAuthenticated]);
    const customized = useMemo(() => hasCustomSettings(), [showSettings, auth.isAuthenticated]);

    const subject = auth.user?.profile?.sub;

    const resetRun = run.reset;
    const prevSubjectRef = useRef(undefined);

    useEffect(() => {
        if (auth.isLoading) return;
        if (!auth.isAuthenticated) {
            reconcileGithubTokenSubject(null);
            resetRun();
            prevSubjectRef.current = undefined;
            return;
        }
        if (prevSubjectRef.current && prevSubjectRef.current !== subject) {
            resetRun();
        }
        prevSubjectRef.current = subject;
        reconcileGithubTokenSubject(subject);
    }, [auth.isLoading, auth.isAuthenticated, subject, resetRun]);

    const signIn = (returnRoute = route) => auth.signinRedirect({ state: { route: returnRoute } });

    const signOut = async () => {
        clearGithubToken();
        run.reset();
        await auth.removeUser();
        window.location.assign(buildSignOutUrl());
    };

    const confirmDeleteAccount = async () => {
        await deleteAccount(auth.user.access_token);
        clearGithubToken();
        run.reset();
        await signOut();
    };

    const runSprintAnalysis = () => {
        if (!auth.isAuthenticated) {
            signIn('run');
            return;
        }
        navigate('run');
        run.start(auth.user.access_token);
    };

    const page = {
        overview: <OverviewPage onNavigate={navigate} />,
        features: <FeaturesPage />,
        run: (
            <RunAgentPage
                settings={settings}
                onEditSettings={() => setShowSettings(true)}
                status={run.status}
                progress={run.progress}
                currentStep={run.currentStep}
                elapsed={run.elapsed}
                error={run.error}
                isAuthenticated={auth.isAuthenticated}
                onRun={runSprintAnalysis}
                onOpenReport={() => run.setReportOpen(true)}
            />
        ),
    }[route];

    return (
        <div className="app">
            <a className="skip-link" href="#main">
                Skip to content
            </a>
            <Navigation
                route={route}
                onNavigate={navigate}
                onSettingsClick={() => setShowSettings(true)}
                hasCustomSettings={customized}
                isAuthenticated={auth.isAuthenticated}
                onSignIn={signIn}
                onSignOut={signOut}
                themePreference={theme.preference}
                onThemeChange={theme.setPreference}
            />

            <main id="main" className="main" key={route} tabIndex={-1}>
                {page}
            </main>

            <Footer />

            {run.report && (
                <Suspense fallback={null}>
                    <ReportModal show={run.reportOpen} markdownReport={run.report} onClose={() => run.setReportOpen(false)} />
                </Suspense>
            )}

            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                authSubject={subject}
                onDeleteAccount={
                    auth.isAuthenticated
                        ? () => {
                              setShowSettings(false);
                              setConfirmingDelete(true);
                          }
                        : undefined
                }
            />

            <ConfirmDialog
                open={confirmingDelete}
                title="Delete your account?"
                message="This permanently removes your sign-in and cannot be undone."
                confirmLabel="Delete account"
                onConfirm={confirmDeleteAccount}
                onCancel={() => setConfirmingDelete(false)}
            />
        </div>
    );
}

export default App;
