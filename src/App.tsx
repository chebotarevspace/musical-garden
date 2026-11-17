import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { CSSProperties } from 'react';
import { Celebration } from './components/garden/Celebration';
import { SecretFx } from './components/SecretFx';
import { OfflineChip, PwaPrompts } from './components/PwaPrompts';
import { TabTakenOver } from './components/TabTakenOver';
import { ErrorBoundary, SectionCrash } from './components/ErrorBoundary';
import { tabGuard } from './lib/tabGuard';
import { backupDue, markBackup, snoozeBackup } from './lib/dataSafety';
import { downloadText, makeBackup } from './lib/backup';
import { mySongs } from './lib/mySongs';
import { myMelodies } from './lib/myMelodies';
import { loadTakes } from './lib/studio';
import type { SecretFx as SecretFxKind, SecretTune } from './lib/gardener';
import { GardenerVisit } from './components/garden/GardenerVisit';
import { GrowToast } from './components/garden/GrowToast';
import { Onboarding } from './components/garden/Onboarding';
import { SessionBar, SessionSummary } from './components/garden/SessionBar';
import { SproutChip } from './components/garden/SproutChip';
import { Mascot } from './components/Mascot';
import { MidiStatus } from './components/MidiStatus';
import { MicButton } from './components/MicButton';
import { PianoKeyboard } from './components/PianoKeyboard';
import { GuideTour } from './components/GuideTour';
import { HotkeysList, Settings } from './components/Settings';
import { Modal } from './components/ui/Modal';
import { SoundToggle } from './components/SoundToggle';
import { Segmented } from './components/ui/Segmented';
import { useFullscreen } from './hooks/useFullscreen';
import { useDailySession } from './hooks/useDailySession';
import { useGardenerVisits } from './hooks/useGardenerVisits';
import { useHotkeys } from './hooks/useHotkeys';
import { useProgressValue } from './hooks/useProgress';
import { useMascotMood } from './hooks/useMascotMood';
import { isAppleMobile, useKeyboardLayout } from './hooks/useMediaQuery';
import { useMidi } from './hooks/useMidi';
import { usePianoMic } from './hooks/usePianoMic';
import { ChordsIcon, DropsIcon, EarIcon, FluencyIcon, GardenIcon, JamIcon, LearnIcon, NotesIcon, SongsIcon, StudioIcon, TrainersIcon } from './components/TabIcons';
import { noteStart, noteStop, playCorrect, playWrong, primeAudio, setRealPiano, stopAllNotes } from './lib/audio';
import { keyboardRows } from './lib/keyboardLayout';
import { createKeyStore } from './lib/keyStore';
import { missWeight, setItemWeights } from './lib/adaptive';
import { applyTheme } from './lib/theme';
import type { PlanStep } from './lib/course';
import { dayKey, progress as learning } from './lib/progress';
import { type OctaveRange, isOnPiano } from './lib/notes';
import { type Settings as SettingsData, type SectionKey, loadSettings, resetSettings, saveSettings } from './lib/storage';
import { HomeSection } from './sections/HomeSection';
import type { SectionInput, SectionProps } from './sections/types';
import s from './App.module.css';

// Sections load on first visit: a smaller start, the rest arrives when needed (and is cached offline).
const ChordsSection = lazy(() => import('./sections/ChordsSection').then((m) => ({ default: m.ChordsSection })));
const EarSection = lazy(() => import('./sections/EarSection').then((m) => ({ default: m.EarSection })));
const SongsSection = lazy(() => import('./sections/SongsSection').then((m) => ({ default: m.SongsSection })));
const FluencySection = lazy(() => import('./sections/FluencySection').then((m) => ({ default: m.FluencySection })));
const JamSection = lazy(() => import('./sections/JamSection').then((m) => ({ default: m.JamSection })));
const DropsSection = lazy(() => import('./sections/DropsSection').then((m) => ({ default: m.DropsSection })));
const StudioSection = lazy(() => import('./sections/StudioSection').then((m) => ({ default: m.StudioSection })));
const LearnSection = lazy(() => import('./sections/LearnSection').then((m) => ({ default: m.LearnSection })));
const NotesSection = lazy(() => import('./sections/NotesSection').then((m) => ({ default: m.NotesSection })));

const SECTIONS: Record<Exclude<SectionKey, 'home'>, ComponentType<SectionProps>> = {
  learn: LearnSection,
  notes: NotesSection,
  fluency: FluencySection,
  chords: ChordsSection,
  ear: EarSection,
  songs: SongsSection,
  jam: JamSection,
  drops: DropsSection,
  studio: StudioSection,
};

type TrainerKey = SettingsData['lastTrainer'];
type TabKey = 'home' | 'learn' | 'trainers' | 'songs';
const isTrainer = (s: SectionKey): s is TrainerKey => s === 'notes' || s === 'fluency' || s === 'chords' || s === 'ear' || s === 'jam' || s === 'drops' || s === 'studio';

export default function App() {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const update = useCallback((patch: Partial<SettingsData>) => setSettings((cur) => ({ ...cur, ...patch })), []);
  // App shortcuts (long-press the installed app's icon): ?go=home | trainers | songs.
  useEffect(() => {
    const url = new URL(window.location.href);
    const go = url.searchParams.get('go');
    if (!go && !url.searchParams.has('source')) return;
    if (go === 'home' || go === 'songs') update({ section: go });
    else if (go === 'trainers') setSettings((cur) => ({ ...cur, section: cur.lastTrainer }));
    url.searchParams.delete('go');
    url.searchParams.delete('source');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [update]);
  const [speech, setSpeech] = useState<{ text: string; id: number } | null>(null);
  const say = useCallback((text: string) => setSpeech({ text, id: Date.now() }), []);

  const store = useMemo(createKeyStore, []);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const inputRef = useRef<SectionInput | null>(null);
  const pressCountRef = useRef(0);
  const visitsRef = useRef<ReturnType<typeof useGardenerVisits> | null>(null);
  const onboardingOpenRef = useRef(false);
  const [pressCount, setPressCount] = useState(0);

  // ---- note on/off: hot path, shared by MIDI and mouse/touch -------------------------
  const noteOn = useCallback(
    (midi: number, velocity = 90) => {
      if (store.isPressed(midi)) return;
      const { noteSound, sound } = settingsRef.current;
      if (noteSound) noteStart(midi, velocity);
      pressCountRef.current++;
      if (onboardingOpenRef.current) setPressCount(pressCountRef.current);
      const sec = settingsRef.current.section;
      if (sec !== 'home') learning.recordActivity(sec, Date.now(), settingsRef.current.chordMode);
      visitsRef.current?.onNoteOn(midi, sec);
      const result = inputRef.current?.noteOn(midi) ?? 'ignored';
      if (result === 'ignored') return;
      const correct = result === 'correct';
      if (isOnPiano(midi)) store.press(midi, correct ? 'correct' : 'wrong');
      // With note playback on, the pitch itself is the "correct" cue — don't double it.
      if (sound) {
        if (!correct) playWrong();
        else if (!noteSound) playCorrect(midi);
      }
    },
    [store],
  );

  const noteOff = useCallback(
    (midi: number) => {
      noteStop(midi);
      visitsRef.current?.onNoteOff(midi);
      store.release(midi);
      inputRef.current?.noteOff(midi);
    },
    [store],
  );

  const releaseAll = useCallback(() => {
    stopAllNotes();
    visitsRef.current?.releaseAll();
    store.releaseAll();
    inputRef.current?.releaseAll();
  }, [store]);

  const midi = useMidi({ onNoteOn: noteOn, onNoteOff: noteOff, onReset: releaseAll });

  // ---- acoustic piano through the microphone ---------------------------------------------
  const { mic, setMic } = usePianoMic({ settings, settingsRef, update, noteOn, noteOff });
  const mascotMood = useMascotMood(midi.connected);
  const { react, markActive } = mascotMood;
  const mascot = useMemo(() => ({ react, markActive }), [react, markActive]);

  // The gardener: surprise visits with a tiny task, and a secret tune that makes him dance.
  const [secretFx, setSecretFx] = useState<{ kind: SecretFxKind; at: number } | null>(null);
  const onSecretTune = useCallback(
    (secret: SecretTune) => {
      react('celebrate', 0);
      say(secret.line);
      learning.count(`secret:${secret.id}`);
      setSecretFx({ kind: secret.fx, at: Date.now() });
    },
    [react, say],
  );
  const visits = useGardenerVisits(onSecretTune);
  visitsRef.current = visits;

  // ---- settings actions -------------------------------------------------------------------
  const toggleSetting = useCallback(
    (key: 'yamaha' | 'sound' | 'mascot' | 'noteSound' | 'adaptive' | 'realPiano', value: boolean) => {
      if ((key === 'sound' || key === 'noteSound') && value) primeAudio();
      if (key === 'noteSound' && !value) stopAllNotes();
      update({ [key]: value });
    },
    [update],
  );
  const setNoteSound = useCallback((on: boolean) => toggleSetting('noteSound', on), [toggleSetting]);

  const setSection = useCallback(
    (section: SectionKey) => {
      if (section === settingsRef.current.section) return;
      releaseAll();
      update(isTrainer(section) ? { section, lastTrainer: section } : { section });
    },
    [update, releaseAll],
  );
  const setTab = useCallback(
    (tab: TabKey) => setSection(tab === 'trainers' ? settingsRef.current.lastTrainer : tab),
    [setSection],
  );

  const fullscreen = useFullscreen();
  const toggleTheme = useCallback(() => update({ theme: settingsRef.current.theme === 'light' ? 'dark' : 'light', themePicked: true }), [update]);
  const [helpOpen, setHelpOpen] = useState(false);

  // ---- course session, garden, onboarding --------------------------------------------------
  const applyStep = useCallback(
    (step: PlanStep) => {
      releaseAll();
      const cur = settingsRef.current;
      const p = step.patch;
      // Per-mode ear levels and per-song keys/tempos are merged, not replaced.
      update({
        ...p,
        ...(p.earLevel ? { earLevel: { ...cur.earLevel, ...p.earLevel } } : {}),
        ...(p.songKeys ? { songKeys: { ...cur.songKeys, ...p.songKeys } } : {}),
        ...(p.songTempos ? { songTempos: { ...cur.songTempos, ...p.songTempos } } : {}),
        section: step.section,
        ...(isTrainer(step.section) ? { lastTrainer: step.section } : {}),
      });
    },
    [update, releaseAll],
  );
  const daily = useDailySession(applyStep, (step) => {
    react('happy');
    say(`Задача выполнена: ${step.title.replace(/^Урок: /, 'урок ')} ✓ Можно дальше!`);
  });
  const openSection = useCallback(
    (section: SectionKey, patch: Partial<SettingsData> = {}) => {
      releaseAll();
      update({ ...patch, section, ...(isTrainer(section) ? { lastTrainer: section } : {}) });
    },
    [update, releaseAll],
  );
  // Only what the shell needs — not the whole progress, which changes on every key press.
  const showOnboarding = useProgressValue((p) => !p.onboarded && Object.keys(p.days).length === 0);
  const outfit = useProgressValue((p) => p.outfit);
  // Weekly backup reminder (re-checked after saving or snoozing).
  const practiceDays = useProgressValue((p) => Object.keys(p.days).length);
  const [backupTick, setBackupTick] = useState(0);
  const backupNeeded = useMemo(() => backupDue(practiceDays), [practiceDays, backupTick]); // eslint-disable-line react-hooks/exhaustive-deps
  // Guided tour: once, right after the introduction (or on the next visit for existing users).
  const tourDone = useProgressValue((p) => p.tourDone);
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (showOnboarding || tourDone) return;
    const t = window.setTimeout(() => setTourOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [showOnboarding, tourDone]);
  const closeTour = useCallback(() => {
    setTourOpen(false);
    learning.setTourDone();
  }, []);
  onboardingOpenRef.current = showOnboarding;
  const finishOnboarding = useCallback(
    (level: 'beginner' | 'notes' | 'chords') => {
      learning.setOnboarded(level);
      // One course for everyone: back home, where the first session waits.
      void level;
      openSection('home');
    },
    [openSection],
  );

  // Adaptive practice: missed notes / chords / intervals come up more often.
  useEffect(() => {
    if (!settings.adaptive) {
      setItemWeights(null);
      return;
    }
    setItemWeights((key) => missWeight(learning.get().items[key]));
    return () => setItemWeights(null);
  }, [settings.adaptive]);

  useHotkeys({
    KeyF: fullscreen.toggle,
    Digit1: () => setSection('home'),
    Digit2: () => setSection('learn'),
    Digit3: () => setSection('notes'),
    Digit4: () => setSection('fluency'),
    Digit5: () => setSection('chords'),
    Digit6: () => setSection('ear'),
    Digit7: () => setSection('songs'),
    Digit8: () => setSection('jam'),
    Digit9: () => setSection('drops'),
    Digit0: () => setSection('studio'),
    KeyS: () => setNoteSound(!settingsRef.current.noteSound),
    Slash: () => setHelpOpen(true),
    KeyT: toggleTheme,
  });

  // ---- persistence & audio unlock ------------------------------------------------------------
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => setRealPiano(settings.realPiano), [settings.realPiano]);
  // Another window handed over: take its latest settings.
  useEffect(() => tabGuard.onReload(() => setSettings(loadSettings())), []);
  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  // Browsers only allow audio after a user gesture: unlock on the first one.
  useEffect(() => {
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    const unlock = () => {
      primeAudio();
      events.forEach((e) => window.removeEventListener(e, unlock, true));
    };
    events.forEach((e) => window.addEventListener(e, unlock, true));
    return () => events.forEach((e) => window.removeEventListener(e, unlock, true));
  }, []);

  // A forced line is one-shot: drop it once delivered so a remounted mascot doesn't repeat it.
  useEffect(() => {
    if (!speech) return;
    const t = window.setTimeout(() => setSpeech(null), 100);
    return () => window.clearTimeout(t);
  }, [speech]);

  // ---- layout -----------------------------------------------------------------------------------
  const [keyboardRange, setKeyboardRangeState] = useState<OctaveRange>({ from: 3, to: 5 });
  const setKeyboardRange = useCallback(
    (r: OctaveRange) => setKeyboardRangeState((cur) => (cur.from === r.from && cur.to === r.to ? cur : r)),
    [],
  );
  const layout = useKeyboardLayout();
  const rows = useMemo(() => keyboardRows(keyboardRange, layout), [keyboardRange, layout]);
  const octaveOffset = settings.yamaha ? -1 : 0;
  const appleMobile = useMemo(isAppleMobile, []);


  const Section = settings.section === 'home' ? null : SECTIONS[settings.section];
  const keyboardHidden = settings.section === 'learn' || settings.section === 'home';

  return (
    <div className={s.app} data-section={settings.section}>
      <header className={s.header}>
        <div className={s.topRow}>
          <button type="button" className={s.brand} data-tour="brand" onClick={() => openSection('home')} aria-label="Музыкальный сад — на главную" title="На главную: Сад (1)">
            <svg className={s.logo} viewBox="0 0 16 16" width="26" height="26" shapeRendering="crispEdges" aria-hidden="true">
              <rect className={s.logoFrame} x="0" y="8" width="16" height="8" />
              <rect x="1" y="9" width="14" height="7" fill="#f4efe6" />
              <g fill="#1a1613">
                <rect x="5" y="9" width="1" height="7" />
                <rect x="10" y="9" width="1" height="7" />
                <rect x="4" y="9" width="3" height="4" />
                <rect x="9" y="9" width="3" height="4" />
              </g>
              <rect className={s.stem} x="7" y="3" width="2" height="6" fill="#4caf50" />
              <g className={s.leaves} fill="#8bd16a">
                <rect x="3" y="2" width="3" height="1" />
                <rect x="4" y="3" width="3" height="1" />
                <rect x="5" y="4" width="2" height="1" />
                <rect x="10" y="1" width="3" height="1" />
                <rect x="9" y="2" width="3" height="1" />
                <rect x="9" y="3" width="2" height="1" />
              </g>
            </svg>
            <span className={s.brandName}>Музыкальный сад</span>
          </button>
          <nav className={s.tabs} aria-label="Разделы">
            <Segmented<TabKey>
              size="lg"
              ariaLabel="Раздел"
              value={isTrainer(settings.section) ? 'trainers' : (settings.section as TabKey)}
              onChange={setTab}
              options={[
                { value: 'home', label: <><GardenIcon /> Сад</>, title: 'Сад и занятие курса (1)' },
                { value: 'learn', label: <><LearnIcon /> Уроки</>, title: 'Уроки и запоминалки (2)' },
                { value: 'trainers', label: <><TrainersIcon /> Тренажёры</>, title: 'Ноты, беглость, аккорды, слух (3–6)' },
                { value: 'songs', label: <><SongsIcon /> Песни</>, title: 'Песни (7)' },
              ]}
            />
          </nav>
          <div className={s.topRight}>
            <OfflineChip />
            {settings.section !== 'home' && (
              <span className={s.tourWrap} data-tour="sprout">
                <SproutChip onOpen={() => openSection('home')} />
              </span>
            )}
            <span className={s.tourWrap} data-tour="sound">
              <SoundToggle on={settings.noteSound} onChange={setNoteSound} />
            </span>
            <span className={s.tourWrap} data-tour="mic">
              <MicButton
                on={settings.micOn}
                status={mic.status}
                meter={mic.meter}
                sensitivity={settings.micSensitivity}
                headphones={settings.micHeadphones}
                noteSound={settings.noteSound}
                onToggle={setMic}
                onSensitivity={(v) => update({ micSensitivity: v })}
                onHeadphones={(v) => update({ micHeadphones: v })}
                onNoteSoundOff={() => setNoteSound(false)}
              />
            </span>
            <span className={s.tourWrap} data-tour="midi">
              <MidiStatus
                status={midi.status}
                devices={midi.devices}
                selectedId={midi.selectedId}
                onSelect={midi.setSelectedId}
                appleMobile={appleMobile}
                onMic={mic.status !== 'unsupported' && !settings.micOn ? () => setMic(true) : undefined}
              />
            </span>
            {fullscreen.supported && (
              <button
                type="button"
                className={s.iconBtn}
                data-tour="fullscreen"
                onClick={fullscreen.toggle}
                aria-pressed={fullscreen.on}
                aria-label={fullscreen.on ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                title={fullscreen.on ? 'Выйти из полноэкранного режима (F или Esc)' : 'На весь экран (F)'}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {fullscreen.on ? (
                    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                  ) : (
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                  )}
                </svg>
              </button>
            )}
            <button
              type="button"
              className={s.iconBtn}
              data-tour="theme"
              onClick={toggleTheme}
              aria-label={settings.theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
              title={settings.theme === 'light' ? 'Включить тёмную тему (T)' : 'Включить светлую тему (T)'}
            >
              {settings.theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                  <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
                </svg>
              )}
            </button>
            <button type="button" className={s.iconBtn} data-tour="help" onClick={() => setHelpOpen(true)} aria-label="Справка и горячие клавиши" title="Справка и горячие клавиши (?)">
              <span className={s.helpGlyph} aria-hidden="true">?</span>
            </button>
            <span className={s.tourWrap} data-tour="settings">
              <Settings settings={settings} onToggle={toggleSetting} onTheme={(light) => update({ theme: light ? 'light' : 'dark', themePicked: true })} onReplaceSettings={(next) => setSettings(next ?? resetSettings())} />
            </span>
          </div>
        </div>

        {isTrainer(settings.section) && (
          <nav className={s.subTabs} aria-label="Тренажёры">
            <Segmented<TrainerKey>
              ariaLabel="Тренажёр"
              value={settings.section}
              onChange={setSection}
              options={[
                { value: 'notes', label: <><NotesIcon /> Ноты</>, title: 'Ноты (3)' },
                { value: 'fluency', label: <><FluencyIcon /> Беглость</>, title: 'Беглость (4)' },
                { value: 'chords', label: <><ChordsIcon /> Аккорды</>, title: 'Аккорды (5)' },
                { value: 'ear', label: <><EarIcon /> Слух</>, title: 'Слух (6)' },
                { value: 'jam', label: <><JamIcon /> Джем</>, title: 'Импровизация (8)' },
                { value: 'drops', label: <><DropsIcon /> Капли</>, title: 'Ритм-игра (9)' },
                { value: 'studio', label: <><StudioIcon /> Студия</>, title: 'Запись и разбор (0)' },
              ]}
            />
          </nav>
        )}

        {daily.session && (
          <SessionBar session={daily.session} onGo={daily.goTo} onNext={daily.next} onFinish={() => daily.finish(daily.session!.index >= daily.session!.steps.length - 1)} onPause={daily.pause} onResume={daily.resume} />
        )}

      </header>

      <ErrorBoundary resetKey={settings.section} fallback={(error, reset) => <SectionCrash error={error} onRetry={reset} onHome={() => { reset(); openSection('home'); }} />}>
      {Section ? (
      <Suspense fallback={<div className={s.loading} aria-busy="true">Загружаю раздел…</div>}>
      <Section
        key={settings.section}
        store={store}
        settings={settings}
        update={update}
        inputRef={inputRef}
        mascot={mascot}
        say={say}
        octaveOffset={octaveOffset}
        midiConnected={midi.connected}
        setKeyboardRange={setKeyboardRange}
      />
      </Suspense>
      ) : (
        <HomeSection
          store={store}
          settings={settings}
          update={update}
          inputRef={inputRef}
          mascot={mascot}
          say={say}
          octaveOffset={octaveOffset}
          midiConnected={midi.connected}
          setKeyboardRange={setKeyboardRange}
          session={daily.session}
          onStartSession={daily.start}
          onResumeSession={() => daily.session && daily.goTo(daily.session.index)}
          open={openSection}
        />
      )}
      </ErrorBoundary>

      {!keyboardHidden && (
      <section className={s.keyboardArea} data-tour="keyboard" data-layout={layout} style={{ '--rows': rows.length } as CSSProperties}>
        {settings.mascot && (
          <div className={s.mascotSeat} data-tour="mascot">
            <Mascot mood={mascotMood.mood} moodId={mascotMood.moodId} streak={mascotMood.streak} speech={speech} outfit={outfit} />
          </div>
        )}
        <PianoKeyboard store={store} octaveOffset={octaveOffset} rows={rows} onPress={noteOn} onRelease={noteOff} />
      </section>
      )}

      {helpOpen && (
        <Modal title="Справка" onClose={() => setHelpOpen(false)} width={520}>
          <button
            type="button"
            className={s.tourBtn}
            onClick={() => {
              setHelpOpen(false);
              setTourOpen(true);
            }}
          >
            🌱 Пройти экскурсию по приложению
          </button>
          <HotkeysList />
        </Modal>
      )}
      {visits.visit && <GardenerVisit visit={visits.visit} outfit={outfit} onClose={visits.close} />}
      <Celebration />
      <SecretFx fx={secretFx} />
      <TabTakenOver />
      <PwaPrompts
        offerInstall={settings.section === 'home' && !settings.installDismissed && !showOnboarding && !tourOpen}
        onDismissInstall={() => update({ installDismissed: true })}
        backupDue={settings.section === 'home' && !daily.session && !showOnboarding && !tourOpen && backupNeeded}
        onBackup={() => {
          downloadText(`musical-garden-${dayKey()}.json`, makeBackup(settingsRef.current, learning.get(), mySongs.get(), loadTakes(), myMelodies.get()));
          markBackup();
          setBackupTick((x) => x + 1);
        }}
        onSnoozeBackup={() => {
          snoozeBackup(3);
          setBackupTick((x) => x + 1);
        }}
      />
      <GrowToast sound={settings.sound} onOpenGarden={() => openSection('home')} />
      {daily.summary && (
        <SessionSummary
          session={daily.summary}
          onMarkDone={daily.markDone}
          onStartNext={(id) => {
            daily.closeSummary();
            daily.start(id);
          }}
          onClose={() => {
            daily.closeSummary();
            openSection('home');
          }}
        />
      )}
      {tourOpen && !showOnboarding && <GuideTour onClose={closeTour} go={openSection} current={settings.section} />}
      {showOnboarding && <Onboarding midiStatus={midi.status} pressCount={pressCount} onDone={finishOnboarding} micOn={settings.micOn} micStatus={mic.status} onMic={setMic} />}
    </div>
  );
}
