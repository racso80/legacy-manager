const STAFF_SCENE_ACTORS = {
  sportingDirector: {
    id: "sportingDirector",
    name: "Director deportivo",
    role: "Dirección deportiva",
    emoji: "👔",
    color: "#60a5fa",
    voice: "Piensa en proyecto, agentes, mercado y futuro. Nunca entra en táctica.",
  },
  assistantCoach: {
    id: "assistantCoach",
    name: "Segundo entrenador",
    role: "Cuerpo técnico",
    emoji: "👥",
    color: "#c9a84c",
    voice: "Habla de fútbol, entrenamiento, rival, sistema y presión competitiva.",
  },
  doctor: {
    id: "doctor",
    name: "Médico",
    role: "Área médica",
    emoji: "👨‍⚕️",
    color: "#22c55e",
    voice: "Es prudente, habla de molestias, riesgo y recuperación. Nunca promete certezas.",
  },
  fitnessCoach: {
    id: "fitnessCoach",
    name: "Preparador físico",
    role: "Preparación física",
    emoji: "🏋️",
    color: "#f59e0b",
    voice: "Protege la carga física y mira el rendimiento a medio plazo.",
  },
  captain: {
    id: "captain",
    name: "Capitán",
    role: "Voz del vestuario",
    emoji: "❤️",
    color: "#ef4444",
    voice: "Habla del grupo, ambiente, liderazgo y vestuario. Nunca habla de economía.",
  },
  president: {
    id: "president",
    name: "Presidente",
    role: "Directiva",
    emoji: "🏛️",
    color: "#a78bfa",
    voice: "Habla de resultados, objetivos, imagen, afición y economía global.",
  },
  academyChief: {
    id: "academyChief",
    name: "Jefe de cantera",
    role: "Cantera",
    emoji: "🌱",
    color: "#84cc16",
    voice: "Piensa en el futuro de los jóvenes y en no quemar etapas.",
  },
  pressOfficer: {
    id: "pressOfficer",
    name: "Responsable de prensa",
    role: "Comunicación",
    emoji: "🎙️",
    color: "#f97316",
    voice: "Cuida la imagen pública, los titulares, las declaraciones y los rumores.",
  },
  player: {
    id: "player",
    name: "Jugador",
    role: "Plantilla",
    emoji: "👤",
    color: "#c9a84c",
    voice: "Habla de sí mismo: minutos, confianza, carrera, futuro y lugar en el equipo.",
  },
};

const OFFICE_DETAILS = [
  "La mañana entra fría por la ventana del despacho. Alguien llama dos veces y espera tu permiso.",
  "Se oye movimiento en el pasillo de Lezama. La puerta se abre despacio, sin prisa.",
  "Hay un café a medio tomar sobre la mesa. Quien entra mira primero al suelo y luego a ti.",
  "Fuera empieza el entrenamiento. Dentro, el despacho se queda en silencio unos segundos.",
  "La lluvia golpea suave el cristal. La conversación no parece improvisada; venía pensada de antes.",
];

function timeOfDay(matchday = 1) {
  return ["08:15", "09:40", "11:05", "12:30", "16:10"][matchday % 5];
}

function officeDetail(matchday = 1) {
  return OFFICE_DETAILS[matchday % OFFICE_DETAILS.length];
}

function actorFromItem(item) {
  if (item.source === "conversation") {
    const conversation = item.conversation;
    if (conversation.actorType === "player") {
      return {
        ...STAFF_SCENE_ACTORS.player,
        id: conversation.actorId,
        name: conversation.actorName,
        role: conversation.role,
        portrait: conversation.portrait,
      };
    }
    const normalizedStaffId = Object.keys(STAFF_SCENE_ACTORS).find(key => STAFF_SCENE_ACTORS[key].name === conversation.actorName);
    return {
      ...(STAFF_SCENE_ACTORS[normalizedStaffId] ?? STAFF_SCENE_ACTORS.assistantCoach),
      name: conversation.actorName,
      role: conversation.role,
    };
  }
  if (item.source === "clubLife") {
    const issue = item.issue;
    if (issue.person?.type === "player") {
      return {
        ...STAFF_SCENE_ACTORS.player,
        id: issue.person.id,
        name: issue.person.name,
        portrait: issue.person.portrait,
      };
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

function firstName(name = "") {
  return String(name).split(" ")[0] || "el jugador";
}

function naturalFallback(text = "") {
  return String(text)
    .replace(/Debe revisarse/gi, "Conviene mirarlo con calma")
    .replace(/Se recomienda/gi, "Yo preferiría")
    .replace(/No existe margen/gi, "No sé si nos queda demasiado margen")
    .replace(/requiere atención/gi, "no deberíamos dejarlo pasar")
    .trim();
}

function conversationOpening(conversation) {
  const opening = naturalFallback(conversation.opening);
  if (conversation.actorType === "player") {
    return `${opening}\n\nNo quiero montar ruido, míster. Pero necesitaba decírtelo a la cara. Puede que me equivoque, pero ahora mismo es lo que siento.`;
  }
  if (conversation.actorName === "Médico") {
    return `${opening}\n\nNo te puedo asegurar que vaya a pasar algo. Precisamente por eso prefiero venir antes de que tengamos que lamentarlo.`;
  }
  if (conversation.actorName === "Director deportivo") {
    return `${opening}\n\nQuizá todavía tengamos margen, pero en estas cosas llegar tarde suele salir caro.`;
  }
  if (conversation.actorName === "Responsable de prensa") {
    return `${opening}\n\nSi no damos una frase clara, alguien escribirá la historia por nosotros.`;
  }
  return `${opening}\n\nNo estoy del todo seguro de que sea grave, pero sí creo que conviene hablarlo hoy.`;
}

function clubLifeMessage(issue, actor) {
  const subject = issue.person?.name ?? issue.playerName ?? issue.title ?? "este asunto";
  const shortSubject = firstName(subject);
  const detail = naturalFallback(issue.message ?? issue.summary ?? "");

  if (actor.id === "player") {
    return `Míster...\n\nLlevo varios días dándole vueltas a mi situación. No es solo una cuestión de minutos o de contrato; es saber dónde estoy de verdad dentro del equipo.\n\n${detail ? `${detail}\n\n` : ""}No quiero tomar una decisión en caliente, pero necesito sentir que hay un plan conmigo.`;
  }

  if (actor.id === "sportingDirector") {
    return `Míster...\n\nAcabo de hablar con el entorno de ${shortSubject}. No han cerrado ninguna puerta, pero empiezan a preguntar demasiado por el futuro.\n\nPuede que todavía tengamos tiempo. O puede que estemos llegando justo al punto en el que otros clubes empiezan a moverse. Yo no lo dejaría dormir mucho más.`;
  }

  if (actor.id === "assistantCoach") {
    return `Míster...\n\nHe estado mirando el próximo partido otra vez. Hay algo que no me termina de convencer.\n\nNo te digo que tengamos que cambiarlo todo, pero si llegamos al encuentro sin decidir esto, el equipo lo va a notar. En el campo las dudas se pagan rápido.`;
  }

  if (actor.id === "doctor") {
    return `Míster...\n\nHe visto a ${shortSubject} moverse con cuidado. No quiero alarmarte, porque puede quedarse en nada, pero hay señales que prefiero no ignorar.\n\nSi forzamos, quizá salga bien. O quizá dentro de unos días estemos hablando de una baja más seria.`;
  }

  if (actor.id === "fitnessCoach") {
    return `Míster...\n\nLa carga de algunos jugadores empieza a pesar. Desde fuera parecen bien, pero los datos y las caras después del trabajo cuentan otra cosa.\n\nPuede que aguanten un partido más. La duda es qué precio pagamos después.`;
  }

  if (actor.id === "captain") {
    return `Míster...\n\nEl grupo está hablando más de lo normal. No vengo a exagerar nada, pero en el vestuario se nota cuando algo empieza a torcerse.\n\nSi lo cogemos ahora, quizá quede en una conversación. Si lo dejamos, puede crecer.`;
  }

  if (actor.id === "president") {
    return `Quería verte un momento.\n\nLa imagen del club también se juega estos días. No hablo solo del marcador; hablo de lo que transmitimos, de la afición y de si seguimos pareciendo un club con rumbo.\n\nNo quiero precipitarme, pero tampoco mirar hacia otro lado.`;
  }

  if (actor.id === "pressOfficer") {
    return `Míster...\n\nLos periodistas ya están olfateando el tema. Todavía no hay incendio, pero sí titulares esperando una chispa.\n\nSi salimos con una frase débil, la sala nos va a empujar donde no queremos ir.`;
  }

  if (actor.id === "academyChief") {
    return `Míster...\n\nHay un chico que cada vez pregunta menos y trabaja más. Eso suele decirme algo.\n\nNo sé si ya está preparado para todo, pero sí creo que merece que hablemos de su camino antes de que pierda impulso.`;
  }

  return `Míster...\n\n${detail || "Hay algo que no deberíamos dejar pasar."}\n\nPuede que no sea urgente todavía, pero tengo la sensación de que si no lo hablamos ahora volverá con más peso.`;
}

function attentionMessage(attention, actor) {
  const summary = naturalFallback(attention.summary ?? attention.title ?? "");
  if (actor.id === "doctor") {
    return `Míster...\n\nPaso un momento porque esto me deja dudas. ${summary}\n\nNo digo que sea grave, pero prefiero que lo miremos antes de que el cuerpo nos obligue.`;
  }
  if (actor.id === "sportingDirector") {
    return `Míster...\n\nTengo esto sobre la mesa y no me gusta dejarlo en espera. ${summary}\n\nQuizá podamos manejarlo con calma, pero en el mercado y en los contratos el silencio también habla.`;
  }
  if (actor.id === "assistantCoach") {
    return `Míster...\n\nAntes de salir al campo quería comentarte algo. ${summary}\n\nNo es una alarma, pero sí una de esas cosas que luego aparecen en el partido si no las cerramos.`;
  }
  if (actor.id === "captain") {
    return `Míster...\n\nTe lo digo porque dentro se nota. ${summary}\n\nPuede que sea solo ruido de vestuario, pero el grupo necesita saber que lo tenemos controlado.`;
  }
  return `Míster...\n\n${summary}\n\nNo sé si será el asunto más grande del día, pero sí merece que lo miremos antes de seguir.`;
}

function sceneMessage(item, actor) {
  if (item.source === "conversation") return conversationOpening(item.conversation);
  if (item.source === "clubLife") return clubLifeMessage(item.issue, actor);
  return attentionMessage(item.attention, actor);
}

const HUMAN_OPTION_LABELS = {
  promise_minutes: "🤝 Cuenta conmigo. Vas a tener tu oportunidad.",
  competition: "📋 Ahora mismo hay mucha competencia, pero te estoy mirando.",
  earn_it: "⚠️ Te lo tienes que ganar cada semana.",
  final_decision: "🧱 Por ahora la decisión no cambia.",
  rest_player: "🧊 Prefiero protegerlo, aunque nos cueste.",
  lower_load: "📉 Bajamos la carga hoy mismo.",
  take_risk: "🔥 Lo necesito. Asumimos el riesgo.",
  listen_group: "🤝 Voy a escuchar al grupo.",
  captain_help: "❤️ Necesito que me ayudes desde dentro.",
  performance_first: "⚠️ Primero necesitamos rendir.",
  review_market: "💼 Lo reviso ahora contigo.",
  not_for_sale: "🧱 No quiero venderlo.",
  ask_more: "💰 Si se mueven, que sea con una oferta mejor.",
  protect_players: "🛡️ La responsabilidad la asumo yo.",
  demand_reaction: "🔥 El equipo tiene que reaccionar.",
  calm_message: "🕊️ Vamos a mantener la calma.",
  keep_working: "🤝 Sigue así. Estás siendo importante.",
  team_first: "👥 Lo importante es que el equipo crezca contigo.",
  apologize: "🤝 Tienes razón. Voy a corregirlo.",
  squad_needs: "🧱 El equipo estaba por encima de la promesa.",
  earn_back: "⚠️ Necesito verte mejor en los entrenamientos.",
};

function consequenceText(option = {}) {
  if (option.memory) return "Se lleva una promesa. Si no la cumples, volverá con otra cara.";
  if (option.tone === "frío" || option.tone === "duro") return "La frase corta la conversación, pero puede dejar marca.";
  if (option.tone === "arriesgado") return "Acepta la decisión, aunque nadie puede garantizar que salga bien.";
  if (option.tone === "protector" || option.tone === "prudente") return "Transmitirás calma, aunque quizá pierdas algo inmediato.";
  return "La persona sale con una respuesta clara, no con un trámite.";
}

function actionLabelFor(actor, actionLabel) {
  if (actor.id === "sportingDirector") return "💼 Déjame hablar con su representante.";
  if (actor.id === "doctor" || actor.id === "fitnessCoach") return "🧊 Prefiero proteger al jugador.";
  if (actor.id === "assistantCoach") return "📋 Vamos a prepararlo ahora.";
  if (actor.id === "captain") return "🤝 Hablaré con el grupo.";
  if (actor.id === "pressOfficer") return "🎙️ Vamos a cuidar el mensaje.";
  if (actor.id === "president") return "🏛️ Lo hablamos con calma, pero hoy.";
  if (actor.id === "academyChief") return "🌱 Quiero ver ese caso contigo.";
  if (actor.id === "player") return "🤝 Cuenta con una respuesta clara.";
  return actionLabel ? `📋 ${actionLabel}` : "📋 Voy a estudiarlo ahora.";
}

function reactionFor(actor, option = {}) {
  if (option.type === "postpone") {
    if (actor.id === "player") return `${actor.name} aprieta los labios y asiente sin discutir. No se va enfadado del todo, pero tampoco tranquilo.`;
    if (actor.id === "president") return "El presidente guarda silencio un segundo. Acepta esperar, aunque su mirada deja claro que no por mucho tiempo.";
    return `${actor.name} asiente despacio. La conversación queda aparcada, pero no cerrada.`;
  }
  if (option.type === "delegate") {
    return `${actor.name} toma nota y baja un poco la tensión. Sale del despacho con una tarea clara, aunque espera que esta vez haya seguimiento.`;
  }
  if (option.id === "take_risk") return "La respuesta deja el aire más pesado. Nadie discute, pero todos entienden que la decisión tiene precio.";
  if (option.id === "final_decision" || option.id === "not_for_sale") return `${actor.name} acepta la firmeza. No parece convencido del todo, pero entiende que no habrá debate ahora.`;
  if (actor.id === "doctor") return "El médico asiente, todavía prudente. No sonríe, pero parece aliviado de que no lo hayas tomado como una simple nota.";
  if (actor.id === "sportingDirector") return "El director deportivo cierra la carpeta y asiente. Ya está pensando en la llamada siguiente.";
  if (actor.id === "captain") return "El capitán respira hondo. Agradece que le hayas hablado claro; eso, en el vestuario, pesa.";
  if (actor.id === "pressOfficer") return "La responsable de prensa desbloquea el móvil y empieza a ordenar el mensaje antes de salir.";
  if (actor.id === "player") return `${actor.name} levanta la mirada. No se marcha con todas las respuestas, pero sí con la sensación de haber sido escuchado.`;
  return `${actor.name} asiente. La escena termina sin certezas absolutas, pero con una decisión tomada.`;
}

function sceneOptions(item, actor) {
  if (item.source === "conversation") {
    return (item.conversation.options ?? []).map(option => {
      const humanLabel = HUMAN_OPTION_LABELS[option.id] ?? option.label;
      const humanOption = {
        id: option.id,
        label: humanLabel,
        tone: option.tone ?? "personal",
        type: "conversation_response",
        responseId: option.id,
        consequence: consequenceText(option),
      };
      return { ...humanOption, reaction: reactionFor(actor, humanOption) };
    });
  }
  const screen = item.source === "clubLife" ? item.issue.action?.screen : item.attention?.action?.screen;
  const actionLabel = item.source === "clubLife" ? item.issue.actionLabel : item.attention?.actionLabel;
  const options = [
    {
      id: "act_now",
      label: actionLabelFor(actor, actionLabel),
      tone: "decisivo",
      type: "act",
      navigateTo: screen ?? "dashboard",
      consequence: "La persona sale con una respuesta concreta y pasas a resolverlo.",
    },
    {
      id: "postpone",
      label: "⏳ Necesito un poco más de tiempo.",
      tone: "prudente",
      type: "postpone",
      consequence: "Ganas margen, pero el asunto puede volver con más tensión.",
    },
    {
      id: "delegate",
      label: "🤝 Tú llévalo de cerca y me avisas.",
      tone: "delegar",
      type: "delegate",
      navigateTo: "dashboard",
      consequence: "No lo cierras del todo, pero alguien queda pendiente de ello.",
    },
  ];
  return options.map(option => ({ ...option, reaction: reactionFor(actor, option) }));
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
    officeDetail: officeDetail(matchday),
    emotionalState: emotionalLabel(issue.emotionalState ?? issue.priority ?? item.priority),
    message: sceneMessage(item, actor),
    consequenceIfIgnored: naturalFallback(issue.consequenceIfIgnored ?? item.consequenceIfIgnored ?? item.consequence ?? "La situación puede volver más adelante con otro tono."),
    expectedOutcome: naturalFallback(issue.expectedOutcome ?? "Que el entrenador marque una línea clara."),
    options: sceneOptions(item, actor),
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
          reaction: decision.reaction,
          season: String(safeGame.season ?? "2025"),
          matchday: safeGame.matchday ?? 1,
          createdAt: Date.now(),
        },
        ...(safeGame.scenes?.log ?? []),
      ].slice(0, 120),
    },
  };
}
