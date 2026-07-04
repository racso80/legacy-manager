import { useEffect, useRef, useState } from "react";
import MatchScreenHeader from "../match/MatchScreenHeader.jsx";
import FormationPanel from "../match/FormationPanel.jsx";
import MatchStatsPanel from "../match/MatchStatsPanel.jsx";
import MatchEventsPanel from "../match/MatchEventsPanel.jsx";
import StaffSignalsPanel from "../match/StaffSignalsPanel.jsx";
import TacticsPanel from "../match/TacticsPanel.jsx";
import TopPerformersPanel from "../match/TopPerformersPanel.jsx";
import CommentaryTicker from "../match/CommentaryTicker.jsx";
import StartingXIBar from "../match/StartingXIBar.jsx";
import SubstitutionPopover from "../match/SubstitutionPopover.jsx";

export default function PCMatchScreen({
  fixture, finished, currentMinute, displayMinute, matchPhase, pauseEvent,
  possession, isHome, leftTeam, rightTeam, leftGoals, rightGoals, leftIsUser, rightIsUser,
  tactics, setTactics, events, eventColors, eventLabels, liveStats, visibleLiveSignals,
  pendingInjury, setPendingInjury, liveDecision, acknowledgeLiveDecision, dismissLiveSignal,
  matchFormation, applyMatchFormation, lineup, subs, livePlayer,
  selectedFormationSlot, setSelectedFormationSlot, swapFormationSlots, doSubstitution,
  subsUsed, maxSubs, subbingSlot, setSubbingSlot, sentOffIds, subbedOutIds,
  playing, setPlaying, togglePlay, manualAdvance, matchSpeed, setMatchSpeed,
  abandonMatch, endMatch, userTeam, oppTeam, oppFormation, liveOppPlayers, oppLineup, oppSentOffIds,
}) {
  const [toast, setToast] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scorePop, setScorePop] = useState(null);
  const prevGoalsRef = useRef({ left: leftGoals, right: rightGoals });

  // Toast de cambio táctico: se autodescarta a los 3s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Animación de "pop" en el marcador al anotar.
  useEffect(() => {
    const prev = prevGoalsRef.current;
    if (leftGoals !== prev.left) setScorePop("left");
    else if (rightGoals !== prev.right) setScorePop("right");
    prevGoalsRef.current = { left: leftGoals, right: rightGoals };
  }, [leftGoals, rightGoals]);
  useEffect(() => {
    if (!scorePop) return;
    const t = setTimeout(() => setScorePop(null), 600);
    return () => clearTimeout(t);
  }, [scorePop]);

  const handleTacticChange = (field, value, fieldLabel, valueLabel) => {
    setTactics(t => ({ ...t, [field]: value }));
    setToast(`El técnico ajusta ${fieldLabel.toLowerCase()}: ${valueLabel}.`);
  };
  const handleFormationChange = (newFormation) => {
    applyMatchFormation(newFormation);
    setToast(`El equipo cambia el dibujo a ${newFormation}.`);
  };

  // Si la señal es la que tiene forzado el partido en pausa, se resuelve con acknowledgeLiveDecision
  // (limpia liveDecision/pauseEvent). Si es solo informativa, basta con descartarla de la lista.
  const handleSignalApply = (signal) => {
    if (liveDecision?.key === signal.key) acknowledgeLiveDecision();
    else dismissLiveSignal(signal.key);
    setToast(`Instrucción aplicada: ${signal.title}.`);
  };
  const handleSignalIgnore = (signal) => {
    if (liveDecision?.key === signal.key) acknowledgeLiveDecision();
    else dismissLiveSignal(signal.key);
  };

  // Selección de slot compartida entre los chips del mini-campo y la franja de titulares:
  // primer toque selecciona (y abre el banco vía subbingSlot), un segundo toque sobre otro
  // titular intercambia posiciones sin gastar cambio.
  const handleSlotClick = (slot) => {
    if (finished || pendingInjury || liveDecision) return;
    if (selectedFormationSlot != null && selectedFormationSlot !== slot) {
      swapFormationSlots(selectedFormationSlot, slot);
      setSubbingSlot(null);
      return;
    }
    if (selectedFormationSlot === slot) {
      setSelectedFormationSlot(null);
      setSubbingSlot(null);
      return;
    }
    setSelectedFormationSlot(slot);
    setSubbingSlot(slot);
  };
  const closeSlotSelection = () => { setSelectedFormationSlot(null); setSubbingSlot(null); };
  const confirmSub = (outId, inId) => { doSubstitution(outId, inId); setSelectedFormationSlot(null); };

  const homeLineup = leftIsUser ? lineup : oppLineup;
  const homePlayers = leftIsUser ? livePlayer : liveOppPlayers;
  const homeFormation = leftIsUser ? matchFormation : oppFormation;
  const homeSentOff = leftIsUser ? sentOffIds : oppSentOffIds;
  const awayLineup = leftIsUser ? oppLineup : lineup;
  const awayPlayers = leftIsUser ? liveOppPlayers : livePlayer;
  const awayFormation = leftIsUser ? oppFormation : matchFormation;
  const awaySentOff = leftIsUser ? oppSentOffIds : sentOffIds;

  const homeVal = (userVal, oppVal) => isHome ? userVal : oppVal;
  const awayVal = (userVal, oppVal) => isHome ? oppVal : userVal;
  const cornersUser = events.filter(e => e.type === "CORNER" && e.team === "user").length;
  const cornersOpp = events.filter(e => e.type === "CORNER" && e.team === "opp").length;
  const statsRows = [
    { label: "Tiros", home: homeVal(liveStats.userShots, liveStats.opponentShots), away: awayVal(liveStats.userShots, liveStats.opponentShots) },
    { label: "Tiros a puerta", home: homeVal(liveStats.userShotsOnTarget, liveStats.opponentShotsOnTarget), away: awayVal(liveStats.userShotsOnTarget, liveStats.opponentShotsOnTarget) },
    { label: "Córners", home: homeVal(cornersUser, cornersOpp), away: awayVal(cornersUser, cornersOpp) },
    { label: "Posesión %", home: homeVal(possession, 100 - possession), away: awayVal(possession, 100 - possession) },
  ];

  const clockLabel = finished ? "FIN" : currentMinute === 0 ? "INICIO" : matchPhase === "halftime" ? "DESCANSO" : `${displayMinute}'`;
  const phaseLabel = `J${fixture.matchday}${pauseEvent ? " · Detenido" : ""}`;
  const alertText = liveDecision ? `${liveDecision.title}. ${liveDecision.message}` : toast;
  const onDismissAlert = liveDecision ? acknowledgeLiveDecision : (toast ? () => setToast(null) : null);
  const latestEvent = events.length ? events[events.length - 1] : null;
  const canAbandon = !playing && currentMinute === 0;

  return (
    <div className="pc-match-v2-root">
      <MatchScreenHeader
        leftTeam={leftTeam} rightTeam={rightTeam} leftGoals={leftGoals} rightGoals={rightGoals}
        leftIsUser={leftIsUser} rightIsUser={rightIsUser}
        clockLabel={clockLabel} phaseLabel={phaseLabel}
        momentumPct={homeVal(possession, 100 - possession)}
        scorePop={scorePop}
        playing={playing} onTogglePlay={togglePlay} onManualAdvance={manualAdvance}
        matchSpeed={matchSpeed} onSetSpeed={setMatchSpeed}
        alertText={alertText} onDismissAlert={onDismissAlert}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(o => !o)}
        onAbandon={() => { setSettingsOpen(false); abandonMatch(); }}
        canAbandon={canAbandon}
      />

      <div className="pc-match-v2-row1">
        <FormationPanel
          team={leftTeam} formation={homeFormation} lineup={homeLineup} players={homePlayers}
          sentOffIds={homeSentOff} events={events} currentMinute={currentMinute}
          sideColorClass="home" reversed={false}
          interactive={leftIsUser} selectedSlot={leftIsUser ? selectedFormationSlot : null}
          onSlotClick={handleSlotClick}
        />
        <MatchStatsPanel rows={statsRows} />
        <MatchEventsPanel events={events} eventColors={eventColors} eventLabels={eventLabels} finished={finished} />
        <FormationPanel
          team={rightTeam} formation={awayFormation} lineup={awayLineup} players={awayPlayers}
          sentOffIds={awaySentOff} events={events} currentMinute={currentMinute}
          sideColorClass="away" reversed
          interactive={rightIsUser} selectedSlot={rightIsUser ? selectedFormationSlot : null}
          onSlotClick={handleSlotClick}
        />
      </div>

      <div className="pc-match-v2-row2">
        <StaffSignalsPanel
          signals={visibleLiveSignals} currentMinute={currentMinute}
          onApply={handleSignalApply} onIgnore={handleSignalIgnore}
        />
        <TacticsPanel
          tactics={tactics} onTacticChange={handleTacticChange}
          formation={matchFormation} onFormationChange={handleFormationChange}
        />
        <TopPerformersPanel
          userPlayers={livePlayer} oppPlayers={liveOppPlayers} userLineup={lineup} oppLineup={oppLineup}
          sentOffIds={sentOffIds} oppSentOffIds={oppSentOffIds} events={events} currentMinute={currentMinute}
          userTeam={userTeam} oppTeam={oppTeam}
        />
      </div>

      {finished ? (
        <button className="pc-match-v2-finished-bar" onClick={endMatch}>Partido finalizado → Continuar</button>
      ) : (
        <>
          <CommentaryTicker latestEvent={latestEvent} matchPhase={matchPhase} />
          {!playing && currentMinute === 0 && (
            <button className="pc-match-v2-prematch-abandon" onClick={abandonMatch}>🟥 Abandonar partido</button>
          )}
        </>
      )}

      <StartingXIBar
        lineup={lineup} players={livePlayer} formation={matchFormation} sentOffIds={sentOffIds}
        events={events} currentMinute={currentMinute}
        selectedSlot={selectedFormationSlot} onSlotClick={handleSlotClick}
      />

      {!finished && pendingInjury && (
        <div className="pc-match-v2-modal-backdrop">
          <div className="pc-match-v2-modal pc-match-v2-modal-narrow" onClick={e => e.stopPropagation()}>
            <div className="pc-match-v2-modal-head"><div>🚑 Lesión</div></div>
            <div className="pc-match-v2-injury-body">
              <div className="pc-match-v2-injury-name">{pendingInjury.name} se ha lesionado</div>
              {(pendingInjury.type || pendingInjury.days) && (
                <div className="pc-match-v2-injury-detail">
                  {pendingInjury.type ?? "Lesión muscular"}{pendingInjury.days ? ` · ${pendingInjury.days} días estimados` : ""}
                </div>
              )}
              <div className="pc-match-v2-injury-actions">
                <button
                  className="pc-match-v2-btn-primary"
                  onClick={() => {
                    const slot = lineup.findIndex(id => id === pendingInjury.playerId);
                    setSelectedFormationSlot(null);
                    setSubbingSlot(slot === -1 ? null : slot);
                    setPendingInjury(null);
                  }}
                >
                  Hacer el cambio
                </button>
                <button className="pc-match-v2-btn-ghost" onClick={() => setPendingInjury(null)}>Ignorar por ahora</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!finished && !pendingInjury && subbingSlot != null && (
        <SubstitutionPopover
          slot={subbingSlot} lineup={lineup} players={livePlayer} subs={subs}
          subsUsed={subsUsed} maxSubs={maxSubs} subbedOutIds={subbedOutIds} sentOffIds={sentOffIds}
          onConfirm={confirmSub} onClose={closeSlotSelection}
        />
      )}
    </div>
  );
}
