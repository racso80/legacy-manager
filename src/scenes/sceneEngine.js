const STAFF_SCENE_ACTORS = {
  sportingDirector: { name:"Director deportivo", role:"Dirección deportiva", emoji:"👔", color:"#60a5fa", style:"Habla de proyecto, margen de negociación y futuro." },
  assistantCoach: { name:"Segundo entrenador", role:"Cuerpo técnico", emoji:"👥", color:"#c9a84c", style:"Directo, futbolero y centrado en el próximo partido." },
  doctor: { name:"Médico", role:"Área médica", emoji:"👨‍⚕️", color:"#22c55e", style:"Prudente, habla de riesgos y nunca promete certezas." },
  fitnessCoach: { name:"Preparador físico", role:"Preparación física", emoji:"🏋️", color:"#f59e0b", style:"Protege la carga física y piensa en el rendimiento sostenible." },
  captain: { name:"Capitán", role:"Voz del vestuario", emoji:"❤️", color:"#ef4444", style:"Protege al grupo y habla desde dentro del vestuario." },
  president: { name:"Presidente", role:"Directiva", emoji:"🏛️", color:"#a78bfa", style:"Exigente, habla de objetivos, imagen y resultados." },
  academyChief: { name:"Jefe de cantera", role:"Cantera", emoji:"🌱", color:"#84cc16", style:"Piensa en el futuro y en el crecimiento de los jóvenes." },
  pressOfficer: { name:"Responsable de prensa", role:"Comunicación", emoji:"🎙️", color:"#f97316", style:"Cuida la imagen pública y mide cada palabra." },
  player: { name:"Jugador", role:"Plantilla", emoji:"👤", color:"#c9a84c", style:"Habla desde su situación personal." },
};

function timeOfDay(matchday = 1) {
  return ["08:15", "09:40", "11:05", "12:30", "16:10"][matchday % 5];
}

function actorFromItem(item) {
  if (item.source === "conversation") {
    const conversation = item.conversation;
    if (conversation.actorType === "player") {
      return {
        id: conversation.actorId,
        name: conversation.actorName,
        role: conversation.role,
        portrait: conversation.portrait,
        emoji: "👤",
        color: "#c9a84c",
        style: "Habla desde su situación personal.",
      };
    }
    return { ...(STAFF_SCENE_ACTORS[conversation.actorName] ?? STAFF_SCENE_ACTORS.assistantCoach), name:conversation.actorName, role:conversation.role };
  }
  if (item.source === "clubLife") {
    const issue = item.issue;
    if (issue.person?.type === "player") {
      return { ...STAFF_SCENE_ACTORS.player, id:issue.person.id, name:issue.person.name, portrait:issue.person.portrait };
    }
    return STAFF_SCENE_ACTORS[issue.actorId] ?? STAFF_SCENE_ACTORS.assistantCoach;
  }
  const actorId = item.actorId ?? "assistantCoach";
  return STAFF_SCENE_ACTORS[actorId] ?? STAFF_SCENE_ACTORS.assistantCoach;
}

function emotionalLabel(state = "neutral") {
  const key = String(state).toLowerCase();
  if (key.includes("enfad") || key.includes("tenso")) return "Enfadado";
  if (key.includes("preocup") || key.includes("serio") || key.includes("inquiet")) return "Preocupado";
  if (key.includes("ilusion") || key.includes("agrade")) return "Contento";
  if (key.includes("expect")) return "Expectante";
  return "Neutral";
}

function sceneMessage(item) {
  if (item.source === "conversation") return item.conversation.opening;
  if (item.source === "clubLife") {
    const issue = item.issue;
    const intro = issue.escalationLevel >= 2
      ? "Míster, esto ya no es una nota más. Está empezando a moverse por dentro del club."
      : "Míster, quería hablarlo contigo antes de que siga creciendo.";
    return `${intro}\n\n${issue.message}\n\n${issue.actionRequired ? `Lo que necesitamos decidir: ${issue.actionRequired}` : ""}`;
  }
  const attention = item.attention;
  return `Míster, hay algo que no deberíamos dejar pasar.\n\n${attention.summary ?? attention.title}\n\nNecesito que tomes una decisión.`;
}

function sceneOptions(item) {
  if (item.source === "conversation") {
    return (item.conversation.options ?? []).map(option => ({
      id: option.id,
      label: option.label,
      tone: option.tone ?? "personal",
      type: "conversation_response",
      responseId: option.id,
      consequence: option.memory ? "Esta respuesta quedará en la memoria del club." : "Afectará a la relación con la persona.",
    }));
  }
  const actionLabel = item.source === "clubLife" ? item.issue.actionLabel : item.attention?.actionLabel;
  const screen = item.source === "clubLife" ? item.issue.action?.screen : item.attention?.action?.screen;
  return [
    {
      id: "act_now",
      label: actionLabel ?? "Resolver ahora",
      tone: "decisivo",
      type: "act",
      navigateTo: screen ?? "dashboard",
      consequence: "El asunto se atiende y pasas a la pantalla donde puedes resolverlo.",
    },
    {
      id: "postpone",
      label: "Ahora no. Que espere.",
      tone: "frío",
      type: "postpone",
      consequence: "Legacy Director recordará que lo has pospuesto. Si se repite, subirá la tensión.",
    },
    {
      id: "delegate",
      label: "Que lo siga el staff y me informen.",
      tone: "delegar",
      type: "delegate",
      navigateTo: "dashboard",
      consequence: "El asunto queda controlado, pero no completamente cerrado.",
    },
  ];
}

export function buildSceneFromDirectorItem(item, game) {
  if (!item) return null;
  const actor = actorFromItem(item);
  const issue = item.issue ?? item.conversation ?? item.attention ?? {};
  const matchday = game?.matchday ?? 1;
  return {
    id: `scene:${item.id}`,
    sourceItemId: item.id,
    rawId: item.rawId,
    source: item.source,
    actor,
    title: issue.title ?? item.attention?.title ?? "Una conversación en el despacho",
    location: "Despacho del entrenador",
    time: timeOfDay(matchday),
    emotionalState: emotionalLabel(issue.emotionalState ?? issue.priority ?? item.priority),
    message: sceneMessage(item),
    consequenceIfIgnored: issue.consequenceIfIgnored ?? item.consequenceIfIgnored ?? item.consequence,
    expectedOutcome: issue.expectedOutcome ?? "Tomar una decisión clara.",
    options: sceneOptions(item),
    original: item,
  };
}

export function ensureSceneState(game) {
  if (!game) return game;
  return {
    ...game,
    scenes: {
      log: game.scenes?.log ?? [],
      pending: game.scenes?.pending ?? {},
    },
  };
}

export function recordSceneDecision(game, scene, decision) {
  const safeGame = ensureSceneState(game);
  if (!scene || !decision) return safeGame;
  return {
    ...safeGame,
    scenes: {
      ...safeGame.scenes,
      log: [
        {
          id: `scene_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sceneId: scene.id,
          sourceItemId: scene.sourceItemId,
          actorName: scene.actor?.name,
          decisionId: decision.id,
          decisionLabel: decision.label,
          season: String(safeGame.season ?? "2025"),
          matchday: safeGame.matchday ?? 1,
          createdAt: Date.now(),
        },
        ...(safeGame.scenes?.log ?? []),
      ].slice(0, 120),
    },
  };
}
