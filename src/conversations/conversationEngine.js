import { calculateInjuryRisk } from "../medical/medicalEngine.js";
import { getLockerRoomSummary, getPlayerPersonality, personalityLine } from "../morale/moraleEngine.js";

const PRIORITY_ORDER = { urgent: 0, important: 1, info: 2 };

const DEFAULT_CONVERSATION_STATE = {
  items: {},
  memories: [],
  log: [],
};

function nowStamp() {
  return Date.now();
}

function normalizeState(state = {}) {
  return {
    ...DEFAULT_CONVERSATION_STATE,
    ...state,
    items: state.items ?? {},
    memories: state.memories ?? [],
    log: state.log ?? [],
  };
}

export function ensureConversationState(game) {
  if (!game) return game;
  return { ...game, conversations: normalizeState(game.conversations) };
}

function playerFace(player) {
  return player?.imageUrl || (player?.id ? `/players/${player.id}.png` : null);
}

function withSavedState(game, conversation) {
  const state = normalizeState(game.conversations);
  const saved = state.items[conversation.id] ?? {};
  return {
    ...conversation,
    status: saved.status ?? "new",
    createdAt: saved.createdAt ?? nowStamp(),
    lastResponseId: saved.lastResponseId ?? null,
  };
}

function recentUserFixture(game) {
  return [...(game.fixtures ?? [])]
    .filter(f => f.played && (f.homeTeamId === game.teamId || f.awayTeamId === game.teamId))
    .sort((a, b) => (b.matchday ?? 0) - (a.matchday ?? 0))[0] ?? null;
}

function resultForUser(game, fixture) {
  if (!fixture) return null;
  const isHome = fixture.homeTeamId === game.teamId;
  const userGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
  const oppGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
  return {
    won: userGoals > oppGoals,
    drew: userGoals === oppGoals,
    lost: userGoals < oppGoals,
    margin: Math.abs(userGoals - oppGoals),
    userGoals,
    oppGoals,
  };
}

function alreadyClosed(game, id) {
  const saved = normalizeState(game.conversations).items[id];
  return ["resolved", "dismissed"].includes(saved?.status);
}

const POSITION_NAMES = {
  POR: "Portero", DFC: "Defensa central", LD: "Lateral derecho",
  LI: "Lateral izquierdo", MCD: "Centrocampista defensivo", MC: "Centrocampista",
  MCO: "Mediapunta", EI: "Extremo izquierdo", ED: "Extremo derecho",
  DC: "Delantero centro", SD: "Segundo delantero",
};

function playerConversation(player, overrides) {
  const personality = getPlayerPersonality(player);
  return {
    actorType: "player",
    actorId: player.id,
    actorName: player.name,
    role: POSITION_NAMES[player.pos] ?? player.pos,
    portrait: playerFace(player),
    emotionalState: "inquieto",
    priority: "important",
    context: "Plantilla",
    personality,
    personalityLabel: personality.label,
    tone: personality.tone,
    ...overrides,
  };
}

function staffConversation(actorName, role, overrides) {
  return {
    actorType: "staff",
    actorName,
    role,
    portrait: null,
    emotionalState: "profesional",
    priority: "important",
    context: "Cuerpo técnico",
    ...overrides,
  };
}

const UNHAPPY_MOTIVES = {
  leader: "Quiere entender su situación para poder ayudar al grupo desde donde le corresponda.",
  professional: "Necesita claridad sobre su rol para seguir rindiendo al máximo.",
  ambitious: "Siente que no está aprovechando su potencial aquí y empieza a mirar otras opciones.",
  reserved: "No suele hablar de estas cosas, pero la situación le pesa más de lo que aparenta.",
  competitive: "Necesita sentir que el equipo confía en él en los momentos que importan.",
  veteran: "A estas alturas valora la claridad y el respeto por encima de cualquier otra cosa.",
  insecureYoung: "Se siente perdido y necesita que alguien le marque el camino con claridad.",
  selfish: "Necesita sentirse un referente del proyecto, no un jugador más del montón.",
  hardWorker: "Trabaja duro cada día y siente que ese esfuerzo no se está reconociendo.",
  conflictive: "Está al límite de su paciencia. Si no se habla claro, la situación puede complicarse.",
  dressingRoomModel: "Antepondría el grupo a su caso, pero necesita hablarlo antes de que sea tarde.",
  balanced: "Quiere entender su situación y espera una respuesta honesta.",
};

function buildGeneratedConversations(game, context = {}) {
  const conversations = [];
  const season = String(game.season ?? "2025");
  const matchday = game.matchday ?? 1;
  const players = game.players ?? [];
  const lineupIds = new Set((context.lineup ?? game._lineup ?? []).filter(Boolean));
  const lockerSummary = getLockerRoomSummary(players);

  const unhappy = [...players]
    .filter(player => !player.injured && ((player.morale ?? 70) <= 42 || (player.happiness ?? 70) <= 42 || (player.managerTrust ?? 70) <= 42))
    .sort((a, b) => {
      const aPersonality = getPlayerPersonality(a);
      const bPersonality = getPlayerPersonality(b);
      return ((a.morale ?? 70) / aPersonality.frequency) - ((b.morale ?? 70) / bPersonality.frequency);
    })[0];
  if (unhappy) {
    const personality = getPlayerPersonality(unhappy);
    const id = `player-minutes:${unhappy.id}:${season}:${Math.floor((unhappy.morale ?? 70) / 10)}`;
    conversations.push(playerConversation(unhappy, {
      id,
      title: `${unhappy.name} quiere hablar contigo`,
      opening: personalityLine(unhappy, "minutes"),
      motive: UNHAPPY_MOTIVES[personality.id] ?? UNHAPPY_MOTIVES.balanced,
      emotionalState: (unhappy.managerTrust ?? 70) < 35 ? (personality.id === "conflictive" ? "enfadado" : "dolido") : personality.id === "reserved" ? "contenido" : "inquieto",
      priority: (unhappy.morale ?? 70) <= 30 ? "urgent" : "important",
      options: [
        { id: "promise_minutes", label: "Tendrás más minutos.", tone: "cercano", effects: { morale: 5, trust: 6 }, memory: { type: "promise_minutes", dueInMatchdays: 2 } },
        { id: "competition", label: "Ahora mismo hay mucha competencia.", tone: "honesto", effects: { morale: -2, trust: 2 } },
        { id: "earn_it", label: "Tendrás que ganártelo.", tone: "exigente", effects: { morale: -1, motivation: 5, trust: 1 } },
        { id: "final_decision", label: "La decisión está tomada.", tone: "frío", effects: { morale: -7, trust: -8 } },
      ],
    }));
  }

  const risky = players
    .map(player => ({ player, risk: calculateInjuryRisk(player, { ...game, game }) }))
    .filter(item => !item.player.injured && item.risk >= 76)
    .sort((a, b) => b.risk - a.risk)[0];
  if (risky) {
    conversations.push(staffConversation("Preparador físico", "Cuerpo técnico", {
      id: `physio-risk:${risky.player.id}:${season}:${matchday}`,
      title: `El preparador físico quiere hablar sobre ${risky.player.name}`,
      opening: `Míster, ${risky.player.name} está al límite. Si fuerza otra vez, el riesgo se dispara.`,
      motive: risky.risk >= 93
        ? "La situación es delicada. Un esfuerzo más podría dejarlo varias semanas fuera."
        : risky.risk >= 85
        ? "Su riesgo de lesión es alto y conviene vigilarlo de cerca."
        : "Su cuerpo acusa la carga acumulada. Sería prudente reducir sus minutos esta semana.",
      emotionalState: "preocupado",
      priority: "urgent",
      options: [
        { id: "rest_player", label: "Lo reservamos en el próximo partido.", tone: "prudente", effects: { trust: 2 }, memory: { type: "rest_recommendation", playerId: risky.player.id, dueInMatchdays: 1 } },
        { id: "lower_load", label: "Reducimos la carga de entrenamiento.", tone: "protector", effects: { morale: 1 }, action: { trainingLoad: "low" } },
        { id: "take_risk", label: "Necesitamos que juegue.", tone: "arriesgado", effects: { morale: -1, trust: -3 } },
      ],
    }));
  }

  if (lockerSummary.atmosphere === "tenso") {
    conversations.push(staffConversation("Capitán", "Voz del vestuario", {
      id: `captain-locker:${season}:${matchday}:${lockerSummary.unhappy.length}`,
      title: "El capitán pide una reunión",
      opening: [
        "Míster, el grupo necesita una señal. Hay gente que siente que no está siendo escuchada.",
        "Perdona que te moleste, pero creo que hay cosas en el vestuario que deberías saber.",
        "Míster, el ambiente no está bien. Hay jugadores que necesitan sentir que cuentan.",
      ][matchday % 3],
      motive: lockerSummary.unhappy.length === 1
        ? "Hay un compañero que no está en su mejor momento y cree que deberías saberlo."
        : "Hay varios compañeros que no están bien y quiere que lo sepas antes de que vaya a más.",
      emotionalState: "serio",
      priority: "important",
      options: [
        { id: "listen_group", label: "Hablaré con el grupo.", tone: "empático", effects: { squadMorale: 3, trust: 2 }, memory: { type: "locker_meeting", dueInMatchdays: 1 } },
        { id: "captain_help", label: "Necesito que me ayudes desde dentro.", tone: "colaborador", effects: { squadTrust: 2 } },
        { id: "performance_first", label: "Primero rendimiento, luego quejas.", tone: "duro", effects: { squadMorale: -3, squadTrust: -2 } },
      ],
    }));
  }

  const incomingOffer = (game.transferMarket?.incomingOffers ?? []).find(offer => offer.status === "pending");
  if (incomingOffer) {
    conversations.push(staffConversation("Director deportivo", "Mercado", {
      id: `sporting-offer:${incomingOffer.id}`,
      title: `Hay una oferta por ${incomingOffer.playerName}`,
      opening: `Ha llegado una propuesta importante por ${incomingOffer.playerName}. No conviene dejarla demasiado tiempo encima de la mesa.`,
      motive: `El director deportivo trae sobre la mesa una oferta de €${((incomingOffer.amount ?? 0) / 1000).toFixed(1)}M.`,
      emotionalState: "expectante",
      priority: "important",
      options: [
        { id: "review_market", label: "La reviso ahora.", tone: "decisivo", navigateTo: "transfers" },
        { id: "not_for_sale", label: "No quiero venderlo.", tone: "firme", effects: { boardTrust: -1 } },
        { id: "ask_more", label: "Intentemos sacar más.", tone: "negociador", effects: { boardTrust: 1 } },
      ],
    }));
  }

  const lastFixture = recentUserFixture(game);
  const lastResult = resultForUser(game, lastFixture);
  if (lastFixture && lastFixture.matchday === matchday - 1 && lastResult?.lost && lastResult.margin >= 2) {
    conversations.push(staffConversation("Responsable de prensa", "Comunicación", {
      id: `press-loss:${season}:${lastFixture.id}`,
      title: "La prensa espera explicaciones",
      opening: "Los periodistas quieren una reacción tras la derrota. La sala está llena.",
      motive: `La prensa quiere explicaciones tras la derrota (${lastResult.userGoals}-${lastResult.oppGoals})`,
      emotionalState: "tenso",
      priority: "important",
      options: [
        { id: "protect_players", label: "La responsabilidad es mía.", tone: "protector", effects: { squadMorale: 2, prestige: 1, fanSupport: -1 } },
        { id: "demand_reaction", label: "El equipo debe dar mucho más.", tone: "exigente", effects: { squadMorale: -2, fanSupport: 2 } },
        { id: "calm_message", label: "Hay que mantener la calma.", tone: "sereno", effects: { fanSupport: 1 } },
      ],
    }));
  }

  const grateful = players
    .filter(player => lineupIds.has(player.id) && (player.morale ?? 70) >= 86 && (player.managerTrust ?? 70) >= 78)
    .sort((a, b) => (b.morale ?? 70) - (a.morale ?? 70))[0];
  if (grateful) {
    conversations.push(playerConversation(grateful, {
      id: `player-thanks:${grateful.id}:${season}:${Math.floor(matchday / 4)}`,
      title: `${grateful.name} pasa por el despacho`,
      opening: personalityLine(grateful, "thanks"),
      motive: [
        "Quería agradecerte la confianza que has depositado en él. Lo está notando.",
        "Se siente valorado últimamente y quiere que lo sepas.",
        "Está en un buen momento y dice que el ambiente en el equipo tiene mucho que ver.",
        "Viene a agradecer el papel que le estás dando. Lo valora más de lo que suele expresar.",
      ][(grateful.overall + matchday) % 4],
      emotionalState: "agradecido",
      priority: "info",
      options: [
        { id: "keep_working", label: "Sigue así, estás siendo importante.", tone: "positivo", effects: { morale: 2, trust: 2 } },
        { id: "team_first", label: "Lo importante es el equipo.", tone: "equilibrado", effects: { trust: 1, squadMorale: 1 } },
      ],
    }));
  }

  return conversations;
}

function buildMemoryConversations(game) {
  const state = normalizeState(game.conversations);
  return state.memories
    .filter(memory => memory.status === "broken" && memory.conversationId)
    .map(memory => {
      const player = (game.players ?? []).find(item => item.id === memory.playerId);
      if (!player) return null;
      const brokenPersonality = getPlayerPersonality(player);
      const isConfrontational = ["conflictive", "selfish"].includes(brokenPersonality.id);
      const isSoftSpoken = ["reserved", "insecureYoung", "dressingRoomModel", "hardWorker"].includes(brokenPersonality.id);
      return playerConversation(player, {
        id: memory.conversationId,
        title: `${player.name} recuerda tu promesa`,
        opening: isConfrontational
          ? "No me puedo quedar callado, míster. Me prometiste minutos y no ha pasado nada."
          : isSoftSpoken
          ? "Sé que no es fácil decir esto... pero me dijiste que tendría más minutos. Sigo esperando."
          : "Míster, hace unos partidos me dijiste que tendría más minutos. No ha pasado. Solo quería hablarlo.",
        motive: "Las promesas incumplidas dañan la relación con el jugador.",
        emotionalState: isConfrontational ? "enfadado" : isSoftSpoken ? "dolido" : "serio",
        priority: "urgent",
        options: [
          { id: "apologize", label: "Tienes razón. Voy a corregirlo.", tone: "honesto", effects: { morale: 2, trust: 1 }, memory: { type: "promise_minutes", dueInMatchdays: 1 } },
          { id: "squad_needs", label: "El equipo estaba por encima de la promesa.", tone: "frío", effects: { morale: -5, trust: -8 } },
          { id: "earn_back", label: "Necesito verte mejor en los entrenamientos.", tone: "exigente", effects: { morale: -2, motivation: 4 } },
        ],
      });
    })
    .filter(Boolean);
}

export function getActiveConversations(game, context = {}) {
  if (!game) return [];
  const safeGame = ensureConversationState(game);
  return [...buildMemoryConversations(safeGame), ...buildGeneratedConversations(safeGame, context)]
    .map(conversation => withSavedState(safeGame, conversation))
    .filter(conversation => !alreadyClosed(safeGame, conversation.id))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || String(a.title).localeCompare(String(b.title)));
}

function applyPlayerDelta(player, effects = {}) {
  return {
    ...player,
    morale: Math.max(1, Math.min(100, Math.round((player.morale ?? 70) + (effects.morale ?? 0)))),
    happiness: Math.max(1, Math.min(100, Math.round((player.happiness ?? 70) + (effects.happiness ?? effects.morale ?? 0)))),
    managerTrust: Math.max(1, Math.min(100, Math.round((player.managerTrust ?? 70) + (effects.trust ?? 0)))),
    motivation: Math.max(1, Math.min(100, Math.round((player.motivation ?? 70) + (effects.motivation ?? 0)))),
  };
}

function applySquadDelta(players, effects = {}) {
  if (!effects.squadMorale && !effects.squadTrust) return players;
  return players.map(player => applyPlayerDelta(player, { morale: effects.squadMorale ?? 0, trust: effects.squadTrust ?? 0 }));
}

export function respondToConversation(game, conversationId, responseId, context = {}) {
  const safeGame = ensureConversationState(game);
  const conversation = getActiveConversations(safeGame, context).find(item => item.id === conversationId);
  if (!conversation) return { game: safeGame, conversation:null, response:null };
  const response = conversation.options.find(item => item.id === responseId) ?? conversation.options[0];
  const state = normalizeState(safeGame.conversations);
  const effects = response.effects ?? {};
  let players = safeGame.players ?? [];

  if (conversation.actorType === "player" && conversation.actorId) {
    players = players.map(player => player.id === conversation.actorId ? applyPlayerDelta(player, effects) : player);
  }
  players = applySquadDelta(players, effects);

  const memories = [...state.memories];
  if (response.memory) {
    const playerId = response.memory.playerId ?? conversation.actorId;
    memories.push({
      id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: response.memory.type,
      playerId,
      sourceConversationId: conversation.id,
      responseId: response.id,
      status: "pending",
      createdSeason: String(safeGame.season ?? "2025"),
      createdMatchday: safeGame.matchday ?? 1,
      dueMatchday: (safeGame.matchday ?? 1) + (response.memory.dueInMatchdays ?? 2),
    });
  }

  let nextGame = {
    ...safeGame,
    players,
    conversations: {
      ...state,
      items: {
        ...state.items,
        [conversation.id]: {
          status: "resolved",
          resolvedAt: nowStamp(),
          lastResponseId: response.id,
          createdAt: state.items[conversation.id]?.createdAt ?? nowStamp(),
        },
      },
      memories,
      log: [
        {
          id: `conversation_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          conversationId: conversation.id,
          responseId: response.id,
          actorName: conversation.actorName,
          title: conversation.title,
          season: String(safeGame.season ?? "2025"),
          matchday: safeGame.matchday ?? 1,
          createdAt: nowStamp(),
        },
        ...state.log,
      ].slice(0, 80),
    },
  };

  if (response.action?.trainingLoad && nextGame.trainingPlan) {
    nextGame = { ...nextGame, trainingPlan: { ...nextGame.trainingPlan, load: response.action.trainingLoad } };
  }
  if (effects.fanSupport && nextGame.fanbase) {
    nextGame = { ...nextGame, fanbase: { ...nextGame.fanbase, support: Math.max(1, Math.min(100, Math.round((nextGame.fanbase.support ?? 70) + effects.fanSupport))) } };
  }
  if ((effects.prestige || effects.boardTrust) && nextGame.legacy) {
    nextGame = {
      ...nextGame,
      legacy: {
        ...nextGame.legacy,
        clubPrestige: Math.max(0, Math.min(100, (nextGame.legacy.clubPrestige ?? 30) + (effects.prestige ?? 0))),
        confidence: Math.max(0, Math.min(100, (nextGame.legacy.confidence ?? 65) + (effects.boardTrust ?? 0))),
      },
    };
  }

  return { game: nextGame, conversation, response };
}

export function advanceConversationMemory(game) {
  const safeGame = ensureConversationState(game);
  const state = normalizeState(safeGame.conversations);
  const currentMatchday = safeGame.matchday ?? 1;
  const lastFixture = recentUserFixture(safeGame);
  const participation = lastFixture?.participation;
  let players = safeGame.players ?? [];
  let changed = false;
  const memories = state.memories.map(memory => {
    if (memory.status !== "pending" || (memory.dueMatchday ?? 999) > currentMatchday) return memory;
    if (memory.type === "promise_minutes") {
      const played = [...(participation?.starters ?? []), ...(participation?.finishers ?? [])].includes(memory.playerId);
      if (played) {
        players = players.map(player => player.id === memory.playerId ? applyPlayerDelta(player, { morale: 3, trust: 5 }) : player);
        changed = true;
        return { ...memory, status: "fulfilled", resolvedMatchday: currentMatchday };
      }
      players = players.map(player => player.id === memory.playerId ? applyPlayerDelta(player, { morale: -7, trust: -10 }) : player);
      changed = true;
      return {
        ...memory,
        status: "broken",
        resolvedMatchday: currentMatchday,
        conversationId: `promise-broken:${memory.playerId}:${memory.id}`,
      };
    }
    return { ...memory, status: "expired", resolvedMatchday: currentMatchday };
  });
  if (!changed) return safeGame;
  return { ...safeGame, players, conversations: { ...state, memories } };
}
