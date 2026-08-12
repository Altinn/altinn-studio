import { useNavigate, useLocation, Route, Routes } from 'react-router-dom';
import { Heading, Paragraph, Tabs } from '@digdir/designsystemet-react';
import { ControlPanel } from './components/ControlPanel';
import { OverviewPage } from './pages/Overview';
import { ComponentsPage } from './pages/Components';
import { SettingsPage } from './pages/Settings';
import { LanguagesPage } from './pages/Languages';
import { ProcessPage } from './pages/Process';
import { SearchPage } from './pages/Search';
import { SettingsConfigPage } from './pages/SettingsConfig';
import { QueryToolsPage } from './pages/QueryTools';
import { UpgradePage } from './pages/Upgrade';
import { UpgradeRunPage } from './pages/UpgradeRun';

const tabs = [
  { value: '/', label: 'Oversikt' },
  { value: '/components', label: 'Komponenter' },
  { value: '/settings', label: 'Innstillinger' },
  { value: '/languages', label: 'Språk' },
  { value: '/process', label: 'Prosess' },
  { value: '/search', label: 'Søk' },
  { value: '/upgrade', label: 'Oppdater' },
  { value: '/query', label: 'Query Tools' },
  { value: '/config', label: 'Konfigurasjon' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Map any path to the closest tab value
  // /upgrade/<app> skal holde «Oppdater»-fanen markert
  const current =
    tabs.find((t) => t.value === location.pathname)?.value ??
    (location.pathname.startsWith('/upgrade') ? '/upgrade' : '/');

  return (
    <div className='min-h-screen'>
      <header className='border-b border-[var(--ds-color-neutral-border-subtle)] bg-[var(--ds-color-neutral-background-default)]'>
        <div className='mx-auto max-w-7xl px-4 py-4'>
          <Heading level={1} data-size='md'>
            Altinn Studio Fleet Statistics
          </Heading>
          <Paragraph data-size='sm' style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            Statistikk over Altinn 3-apper i prod og tt02
          </Paragraph>
        </div>
      </header>
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-6'>
        <ControlPanel />

        <Tabs value={current} onChange={(value) => navigate(value)}>
          <Tabs.List>
            {tabs.map((t) => (
              <Tabs.Tab key={t.value} value={t.value}>
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        <Routes>
          <Route path='/' element={<OverviewPage />} />
          <Route path='/components' element={<ComponentsPage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/languages' element={<LanguagesPage />} />
          <Route path='/process' element={<ProcessPage />} />
          <Route path='/search' element={<SearchPage />} />
          <Route path='/upgrade' element={<UpgradePage />} />
          <Route path='/upgrade/:appId' element={<UpgradeRunPage />} />
          <Route path='/query' element={<QueryToolsPage />} />
          <Route path='/config' element={<SettingsConfigPage />} />
        </Routes>
      </main>
    </div>
  );
}
