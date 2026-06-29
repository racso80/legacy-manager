const STAFF_SCENE_ACTORS = {
  sportingDirector: {
    id: "sportingDirector",
    name: "Director deportivo",
    role: "DirecciÃ³n deportiva",
    emoji: "ðŸ‘”",
    color: "#60a5fa",
    voice: "Piensa en proyecto, agentes, mercado y futuro. Nunca entra en tÃ¡ctica.",
  },
  assistantCoach: {
    id: "assistantCoach",
    name: "Segundo entrenador",
    role: "Cuerpo tÃ©cnico",
    emoji: "ðŸ‘¥",
    color: "#c9a84c",
    voice: "Habla de fÃºtbol, entrenamiento, rival, sistema y presiÃ³n competitiva.",
  },
  doctor: {
    id: "doctor",
    name: "MÃ©dico",
    role: "Ãrea mÃ©dica",
    emoji: "ðŸ‘¨â€âš•ï¸",
    color: "#22c55e",
    voice: "Es prudente, habla de molestias, riesgo y recuperaciÃ³n. Nunca promete certezas.",
  },
  fitnessCoach: {
    id: "fitnessCoach",
    name: "Preparador fÃ­sico",
    role: "PreparaciÃ³n fÃ­sica",
    emoji: "ðŸ‹ï¸",
    color: "#f59e0b",
    voice: "Protege la carga fÃ­sica y mira el rendimiento a medio plazo.",
  },
  captain: {
    id: "captain",
    name: "CapitÃ¡n",
    role: "Voz del vestuario",
    emoji: "â¤ï¸",
    color: "#ef4444",
    voice: "Habla del grupo, ambiente, liderazgo y vestuario. Nunca habla de economÃ­a.",
  },
  president: {
    id: "president",
    name: "Presidente",
    role: "Directiva",
    emoji: "ðŸ›ï¸",
    color: "#a78bfa",
    voice: "Habla de resultados, objetivos, imagen, aficiÃ³n y economÃ­a global.",
  },
  academyChief: {
    id: "academyChief",
    name: "Jefe de cantera",
    role: "Cantera",
    emoji: "ðŸŒ±",
    color: "#84cc16",
    voice: "Piensa en el futuro de los jÃ³venes y en no quemar etapas.",
  },
  pressOfficer: {
    id: "pressOfficer",
    name: "Responsable de prensa",
    role: "ComunicaciÃ³n",
    emoji: "ðŸŽ™ï¸",
    color: "#f97316",
    voice: "Cuida la imagen pÃºblica, los titulares, las declaraciones y los rumores.",
  },
};

const OFFICE_DETAILS = [
  "La maÃ±ana entra frÃ­a por la ventana del despacho. Alguien llama dos veces y espera tu permiso.",
  "Se oye movimiento en el pasillo de Lezama. La puerta se abre despacio, sin prisa.",
  "Hay un cafÃ© a medio tomar sobre la mesa. Quien entra mira primero al suelo y luego a ti.",
  "Fuera empieza el entrenamiento. Dentro, el despacho se queda en silencio unos segundos.",
  "La lluvia golpea suave el cristal. La conversaciÃ³n no parece improvisada; venÃ­a pensada de antes.",
];

function timeOfDay(matchday = 1) {
  return ["08:15", "09:40", "11:05", "12:30", "16:10"][matchday % 5];
}

function officeDetail(matchday = 1) {
  return OFFICE_DETAILS[matchday % OFFICE_DETAILS.length];
}

function actorFromItem(item) {
  if (item.normalizedIssue?.owner) {
    return item.normalizedIssue.owner;
  }
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
    return STAFF_SCENE_ACTORS[item.ownerActorId ?? issue.actorId] ?? STAFF_SCENE_ACTORS.assistantCoach;
  }
  const actorId = item.ownerActorId ?? item.actorId ?? "assistantCoach";
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

function sceneIssueKey(item) {
  return item?.normalizedIssue?.id ?? item?.issueKey ?? item?.attention?.issueKey ?? item?.groupKey ?? item?.topicKey ?? item?.id ?? "";
}

function sceneSubjectId(item) {
  return item?.normalizedIssue?.subjectId
    ?? item?.attention?.playerId
    ?? item?.attention?.action?.playerId
    ?? item?.issue?.person?.id
    ?? item?.issue?.payload?.playerId
    ?? item?.conversation?.actorId
    ?? item?.rawId
    ?? null;
}

function storyKeyFromItem(item) {
  const key = String(sceneIssueKey(item));
  const subject = sceneSubjectId(item);
  if ((key.startsWith("contract_renewal_pending:") || key.startsWith("contract_renewal_response:")) && subject) {
    return `contract_renewal:${subject}`;
  }
  if ((key.startsWith("injury:") || key.startsWith("injury_risk:")) && subject) {
    return `medical:${subject}`;
  }
  if (key.startsWith("youth_high_potential:") && subject) {
    return `youth:${subject}`;
  }
  return key;
}

function previousStoryLog(game, storyKey, sourceItemId) {
  if (!storyKey) return null;
  return (game?.scenes?.log ?? []).find(item => item.storyKey === storyKey && item.sourceItemId !== sourceItemId) ?? null;
}

function continuityIntro(item, game) {
  const storyKey = storyKeyFromItem(item);
  const previous = previousStoryLog(game, storyKey, item?.id);
  if (!previous) return "";
  const currentMatchday = game?.matchday ?? 1;
  const days = Math.max(1, currentMatchday - (previous.matchday ?? currentMatchday));
  if (storyKey.startsWith("contract_renewal:")) return days >= 5 ? "Como hablamos la semana pasada..." : "Como comentamos hace unos dias...";
  if (storyKey.startsWith("medical:")) return "Traigo novedades desde el ultimo informe.";
  if (storyKey.startsWith("youth:")) return "He seguido mirando al chico desde la ultima vez.";
  return "Hay novedades desde nuestra ultima conversacion.";
}

function naturalFallback(text = "") {
  return String(text)
    .replace(/Debe revisarse/gi, "Conviene mirarlo con calma")
    .replace(/Se recomienda/gi, "Yo preferirÃ­a")
    .replace(/No existe margen/gi, "No sÃ© si nos queda demasiado margen")
    .replace(/requiere atenciÃ³n/gi, "no deberÃ­amos dejarlo pasar")
    .trim();
}

function conversationOpening(conversation) {
  const opening = naturalFallback(conversation.opening);
  if (conversation.actorType === "player") {
    const profileId = conversation.personality?.id ?? conversation.personality?.profileId;
    const tails = {
      professional: "No quiero poner excusas. SeguirÃ© trabajando, pero necesitaba hablarlo con usted.",
      ambitious: "No me conformo con estar de paso. Quiero un sitio importante y creo que puedo ganÃ¡rmelo.",
      conflictive: "Prefiero decirlo claro antes de que esto se enquiste. Ahora mismo no lo entiendo.",
      reserved: "No suelo pedir estas conversaciones, mÃ­ster. Por eso querÃ­a hacerlo con calma.",
      leader: "Si esto afecta al grupo, prefiero que lo hablemos de frente y sin ruido.",
      hardWorker: "Voy a seguir apretando cada dÃ­a, pero necesitaba saber si vamos en la misma direcciÃ³n.",
      insecureYoung: "Igual me estoy equivocando, pero necesitaba escucharlo de usted.",
      selfish: "Necesito sentir que soy importante. Si no, serÃ¡ difÃ­cil que todo siga igual.",
      dressingRoomModel: "No quiero que mi situaciÃ³n pese mÃ¡s que el equipo, pero tambiÃ©n necesito claridad.",
    };
    return `${opening}\n\n${tails[profileId] ?? "No quiero montar ruido, mÃ­ster. Pero necesitaba decÃ­rtelo a la cara. Puede que me equivoque, pero ahora mismo es lo que siento."}`;
  }
  if (conversation.actorName === "MÃ©dico") {
    return `${opening}\n\nNo te puedo asegurar que vaya a pasar algo. Precisamente por eso prefiero venir antes de que tengamos que lamentarlo.`;
  }
  if (conversation.actorName === "Director deportivo") {
    return `${opening}\n\nQuizÃ¡ todavÃ­a tengamos margen, pero en estas cosas llegar tarde suele salir caro.`;
  }
  if (conversation.actorName === "Responsable de prensa") {
    return `${opening}\n\nSi no damos una frase clara, alguien escribirÃ¡ la historia por nosotros.`;
  }
  return `${opening}\n\nNo estoy del todo seguro de que sea grave, pero sÃ­ creo que conviene hablarlo hoy.`;
}

function clubLifeMessage(issue, actor) {
  const subject = issue.person?.name ?? issue.playerName ?? issue.title ?? "este asunto";
  const shortSubject = firstName(subject);
  const detail = naturalFallback(issue.message ?? issue.summary ?? "");

  if (actor.id === "player") {
    return `MÃ­ster...\n\nLlevo varios dÃ­as dÃ¡ndole vueltas a mi situaciÃ³n. No es solo una cuestiÃ³n de minutos o de contrato; es saber dÃ³nde estoy de verdad dentro del equipo.\n\n${detail ? `${detail}\n\n` : ""}No quiero tomar una decisiÃ³n en caliente, pero necesito sentir que hay un plan conmigo.`;
  }

  if (actor.id === "sportingDirector") {
    return `MÃ­ster...\n\nAcabo de hablar con el entorno de ${shortSubject}. No han cerrado ninguna puerta, pero empiezan a preguntar demasiado por el futuro.\n\nPuede que todavÃ­a tengamos tiempo. O puede que estemos llegando justo al punto en el que otros clubes empiezan a moverse. Yo no lo dejarÃ­a dormir mucho mÃ¡s.`;
  }

  if (actor.id === "assistantCoach") {
    return `MÃ­ster...\n\nHe estado mirando el prÃ³ximo partido otra vez. Hay algo que no me termina de convencer.\n\nNo te digo que tengamos que cambiarlo todo, pero si llegamos al encuentro sin decidir esto, el equipo lo va a notar. En el campo las dudas se pagan rÃ¡pido.`;
  }

  if (actor.id === "doctor") {
    return `MÃ­ster...\n\nHe visto a ${shortSubject} moverse con cuidado. No quiero alarmarte, porque puede quedarse en nada, pero hay seÃ±ales que prefiero no ignorar.\n\nSi forzamos, quizÃ¡ salga bien. O quizÃ¡ dentro de unos dÃ­as estemos hablando de una baja mÃ¡s seria.`;
  }

  if (actor.id === "fitnessCoach") {
    return `MÃ­ster...\n\nLa carga de algunos jugadores empieza a pesar. Desde fuera parecen bien, pero los datos y las caras despuÃ©s del trabajo cuentan otra cosa.\n\nPuede que aguanten un partido mÃ¡s. La duda es quÃ© precio pagamos despuÃ©s.`;
  }

  if (actor.id === "captain") {
    return `MÃ­ster...\n\nEl grupo estÃ¡ hablando mÃ¡s de lo normal. No vengo a exagerar nada, pero en el vestuario se nota cuando algo empieza a torcerse.\n\nSi lo cogemos ahora, quizÃ¡ quede en una conversaciÃ³n. Si lo dejamos, puede crecer.`;
  }

  if (actor.id === "president") {
    return `QuerÃ­a verte un momento.\n\nLa imagen del club tambiÃ©n se juega estos dÃ­as. No hablo solo del marcador; hablo de lo que transmitimos, de la aficiÃ³n y de si seguimos pareciendo un club con rumbo.\n\nNo quiero precipitarme, pero tampoco mirar hacia otro lado.`;
  }

  if (actor.id === "pressOfficer") {
    return `MÃ­ster...\n\nLos periodistas ya estÃ¡n olfateando el tema. TodavÃ­a no hay incendio, pero sÃ­ titulares esperando una chispa.\n\nSi salimos con una frase dÃ©bil, la sala nos va a empujar donde no queremos ir.`;
  }

  if (actor.id === "academyChief") {
    return `MÃ­ster...\n\nHay un chico que cada vez pregunta menos y trabaja mÃ¡s. Eso suele decirme algo.\n\nNo sÃ© si ya estÃ¡ preparado para todo, pero sÃ­ creo que merece que hablemos de su camino antes de que pierda impulso.`;
  }

  return `MÃ­ster...\n\n${detail || "Hay algo que no deberÃ­amos dejar pasar."}\n\nPuede que no sea urgente todavÃ­a, pero tengo la sensaciÃ³n de que si no lo hablamos ahora volverÃ¡ con mÃ¡s peso.`;
}

function attentionMessage(attention, actor) {
  const summary = naturalFallback(attention.summary ?? attention.title ?? "");
  if (actor.id === "doctor") {
    return `MÃ­ster...\n\nPaso un momento porque esto me deja dudas. ${summary}\n\nNo digo que sea grave, pero prefiero que lo miremos antes de que el cuerpo nos obligue.`;
  }
  if (actor.id === "sportingDirector") {
    return `MÃ­ster...\n\nTengo esto sobre la mesa y no me gusta dejarlo en espera. ${summary}\n\nQuizÃ¡ podamos manejarlo con calma, pero en el mercado y en los contratos el silencio tambiÃ©n habla.`;
  }
  if (actor.id === "assistantCoach") {
    return `MÃ­ster...\n\nAntes de salir al campo querÃ­a comentarte algo. ${summary}\n\nNo es una alarma, pero sÃ­ una de esas cosas que luego aparecen en el partido si no las cerramos.`;
  }
  if (actor.id === "captain") {
    return `MÃ­ster...\n\nTe lo digo porque dentro se nota. ${summary}\n\nPuede que sea solo ruido de vestuario, pero el grupo necesita saber que lo tenemos controlado.`;
  }
  return `MÃ­ster...\n\n${summary}\n\nNo sÃ© si serÃ¡ el asunto mÃ¡s grande del dÃ­a, pero sÃ­ merece que lo miremos antes de seguir.`;
}

function renewalResponseKind(item) {
  return item.normalizedIssue?.responseType ?? item.attention?.responseType ?? item.responseType ?? null;
}

function isRenewalResponseIssue(item) {
  return String(item.normalizedIssue?.id ?? item.issueKey ?? item.attention?.issueKey ?? "").startsWith("contract_renewal_response:");
}

function isClubLifeMoment(item) {
  const key = String(item.normalizedIssue?.id ?? item.issueKey ?? item.attention?.issueKey ?? "");
  return key.startsWith("club_life_moment:") || key.startsWith("weekly_preparation:") || key.startsWith("external_world:") || key.startsWith("locker_life:");
}

function clubLifeMomentMessage(item, actor, game) {
  const issue = item.normalizedIssue ?? item.attention ?? {};
  const intro = continuityIntro(item, game);
  const subject = issue.subjectName ?? issue.playerName ?? "el chico";
  const shortSubject = firstName(subject);
  const type = issue.momentType ?? item.attention?.momentType;
  const mentorName = item.attention?.mentorName ?? item.mentorName;
  if (type === "locker_mentor_young") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}No vengo por un problema. Vengo por algo que me gusta ver.\n\n${mentorName ?? "Un veterano"} ha estado muy encima de ${shortSubject} durante los entrenamientos. Correcciones pequeÃ±as, gestos, consejos de esos que no salen en ningun informe.\n\nEl chico lo agradece. Y el grupo tambien nota cuando los mayores cuidan a los jovenes.`;
  }
  if (type === "locker_leader_after_loss") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Despues de la derrota, ${shortSubject} ha juntado al grupo.\n\nNo ha sido un discurso de pelicula. Ha sido algo mas importante: cerrar la puerta, mirarse a la cara y recordar que esto sigue.\n\nSi quiere intervenir, este es buen momento. Si no, tambien puede dejar que el vestuario respire por si mismo.`;
  }
  if (type === "locker_good_mood") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}El grupo esta bien.\n\nNo perfecto, porque un vestuario nunca lo esta, pero si unido. Se nota en como entrenan, en como se hablan y en como los suplentes empujan sin romper.\n\nA veces tambien conviene que el entrenador sepa cuando no tiene que apagar ningun fuego.`;
  }
  if (type === "locker_young_nervous") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}${shortSubject} esta viviendo una semana grande.\n\nSe le nota ilusionado, pero tambien algo encogido. Entrenar con el primer equipo impone. Los mayores le estan ayudando, pero una palabra suya puede pesar mucho.\n\nNo hace falta prometerle nada. Solo decidir como acompanarlo.`;
  }
  if (type === "locker_substitute_positive") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Queria hablarle de ${shortSubject}.\n\nNo esta jugando todo lo que querria, pero esta trabajando muy bien. No se ha borrado, no se ha quejado y esta apretando a los titulares.\n\nEse tipo de actitud sostiene un vestuario. Si lo reconocemos bien, puede contagiar.`;
  }
  if (type === "locker_recovery_mood") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}${shortSubject} ha vuelto con otra cara.\n\nTodavia hay que medir el regreso, pero animicamente se le ve mejor. Volver a sentirse parte del grupo tambien forma parte de la recuperacion.\n\nMi consejo es acompanar el proceso sin convertirlo en una carrera.`;
  }
  if (type === "locker_new_signing") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}${shortSubject} empieza a encontrar sitio.\n\nLos primeros dias no siempre se ven desde fuera: bromas, rutinas, donde sentarse, con quien hablar. El grupo le esta abriendo hueco poco a poco.\n\nNo hace falta forzarlo, pero un gesto del entrenador puede acelerar mucho la integracion.`;
  }
  if (type === "world_big_win") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}La victoria no se ha quedado dentro del vestuario.\n\nLos periodistas empiezan a hablar del equipo con otro tono. La aficion tambien. Eso puede ayudarnos, pero si lo alimentamos demasiado pronto, maÃ±ana nos lo van a exigir como obligacion.\n\nSolo necesito una linea: ilusion o prudencia.`;
  }
  if (type === "world_hard_loss") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Fuera se esta hablando bastante del resultado.\n\nNo es solo perder. Es la forma en que se interpreta. La sala va a buscar culpables, titulares y una frase que resuma todo.\n\nSi no damos un mensaje claro, lo van a escribir por nosotros.`;
  }
  if (type === "world_derby_win" || type === "world_derby_loss" || type === "world_derby_draw") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}El derbi sigue en la calle.\n\nNo hace falta que le diga lo que mueve un partido asi. Hay bares, radios y redes hablando de cada decision. Podemos bajar el tono, proteger al grupo o aprovechar el ambiente.\n\nLo importante es que no parezca que el club no entiende lo que acaba de pasar.`;
  }
  if (type === "world_win_streak") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}La ciudad empieza a creer.\n\nDentro podemos decir que solo son tres partidos, pero fuera la gente ya esta construyendo una historia. Eso puede empujar al equipo... o meterle una mochila.\n\nConviene elegir como convivimos con esa ilusion.`;
  }
  if (type === "world_negative_streak") {
    return `${intro ? `${intro}\n\n` : "Queria verte un momento.\n\n"}La mala racha ya no es un dato interno.\n\nLa directiva lo ve, la aficion lo comenta y la prensa empieza a preguntar si hay rumbo. No vengo a dramatizar, pero si a decirte que el silencio tambien se interpreta.\n\nNecesitamos una respuesta, aunque sea serena.`;
  }
  if (type === "world_youth_debut") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Todo el mundo pregunta por ${shortSubject}.\n\nEl debut ha conectado con la gente. Es bonito, pero tambien peligroso si le ponemos encima una historia demasiado grande.\n\nPodemos protegerlo, darle valor o llevarlo al mensaje de equipo.`;
  }
  if (type === "world_serious_injury") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}La lesion de ${shortSubject} ya se esta comentando fuera.\n\nPara nosotros es un asunto medico y deportivo. Para el exterior es una pregunta inmediata: como va a responder el equipo sin el.\n\nAntes de que se llene de ruido, conviene tener claro el mensaje.`;
  }
  if (type === "world_transfer_reaction") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}El movimiento ya tiene eco fuera.\n\nCuando el club ficha o mueve una pieza, todo el mundo intenta leer una intencion: ambicion, urgencia, futuro, presion. No significa que tengamos que explicar todo.\n\nPero si conviene saber que historia queremos dejar que se cuente.`;
  }
  if (type === "world_transfer_rumor") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}No hay oferta formal, pero el ruido existe.\n\nAlgunos clubes miran a ${shortSubject}. Ahora mismo es solo ambiente de mercado, nada mas. Pero estas cosas, si no se vigilan, pueden entrar en el vestuario sin llamar.\n\nYo lo llevaria con discrecion.`;
  }
  if (type === "weekly_rival_report") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}He vuelto a mirar al rival con calma.\n\nNo creo que haya que cambiarlo todo, pero si preparamos la semana como si fuera un partido cualquiera, vamos a perder detalles. Hay una zona del campo donde podemos hacerles dano y otra donde no conviene regalar metros.\n\nSolo necesito saber si seguimos con el plan o si ajustamos algo antes de entrenarlo.`;
  }
  if (type === "weekly_training_focus") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}La semana nos da para una cosa, no para diez.\n\nPodemos apretar, recuperar piernas, trabajar balon parado o reforzar conceptos. Lo importante es elegirlo ahora, porque el equipo nota cuando cada dia empuja en una direccion distinta.\n\nNo es una urgencia. Es preparar el partido antes de que el partido nos prepare a nosotros.`;
  }
  if (type === "weekly_locker_room") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}No vengo por un incendio. Vengo porque la semana tambien se juega dentro.\n\nEl grupo esta pendiente del siguiente partido. Algunos estan con confianza, otros miran de reojo si van a tener minutos. Nada grave, pero conviene que el mensaje sea claro.\n\nSi quiere, lo movemos con calma antes de que llegue el ruido.`;
  }
  if (type === "weekly_medical_followup") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}No traigo malas noticias, y eso ya es bastante.\n\nPero hay cargas que prefiero comentar antes del partido. Si decidimos hoy quien necesita cuidado, el domingo no tendremos que improvisar con el cuerpo caliente.\n\nMi recomendacion es simple: revisar antes de forzar.`;
  }
  if (type === "weekly_academy_progress") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Esta semana he querido pasar sin hacer ruido, pero creo que merece la pena que lo sepa.\n\n${shortSubject} ha dado un paso pequeno, de esos que no salen en titulares pero si cuentan para su futuro. No le pido una decision grande.\n\nSolo que lo tengamos presente mientras preparamos el equipo.`;
  }
  if (type === "weekly_press_context") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Antes del partido ya se esta construyendo un relato fuera.\n\nNo necesitamos una rueda de prensa larga, pero si conviene saber que tono queremos transmitir: calma, ambicion o prudencia. La prensa va a llenar los huecos si nosotros no damos una linea clara.\n\nMe basta con saber por donde quiere llevar el mensaje.`;
  }
  if (type === "captain_gratitude") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Solo queria decirtelo antes de que empiece el ruido de la semana.\n\nEl grupo esta contigo. Han agradecido como gestionaste los ultimos dias; no todos lo dicen en voz alta, pero se nota en el vestuario.\n\nNo venia a pedir nada. A veces tambien conviene saber cuando algo esta saliendo bien.`;
  }
  if (type === "academy_hope") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}${intro ? "" : "Perdone que venga con esta cara, pero creo que tenemos algo bonito entre manos.\n\n"}${shortSubject} tiene detalles que no se entrenan facilmente. Todavia hay que protegerlo, claro, pero cuando un chico mira asi el juego... merece que no lo perdamos de vista.\n\nNo le pido que lo suba ya. Solo que lo mire con calma.`;
  }
  if (type === "medical_good_news") {
    return `Mister...\n\nHoy traigo una buena noticia, que tampoco esta mal variar un poco.\n\n${shortSubject} esta respondiendo mejor de lo esperado. No quiero correr, ya me conoce, pero la recuperacion va por buen camino.\n\nSi seguimos sin precipitarnos, podemos ganar un jugador sin pagar el precio dos veces.`;
  }
  if (type === "president_praise") {
    return `Queria verte un minuto.\n\nNo voy a alargarme. El club transmite una sensacion de rumbo, y eso importa.\n\nLos resultados son importantes, ya lo sabes. Pero tambien lo es que la gente sienta que hay una idea detras. Sigue asi.`;
  }
  if (type === "assistant_training_good") {
    return `Mister...\n\nHoy el entrenamiento ha tenido otra energia. Se les ha visto con chispa, con mala leche buena, de la que hace falta para competir.\n\nYo saldria de aqui contento. No porque ya este todo hecho, sino porque el equipo empieza a parecerse a lo que queremos.`;
  }
  return `Mister...\n\nSolo queria comentarle una cosa. No es un problema, pero si una de esas pequenas senales que hacen que el club parezca vivo.\n\n${issue.summary ?? "La semana ha dejado una sensacion positiva."}`;
}

function renewalResponseMessage(item, game) {
  const issue = item.normalizedIssue ?? item.attention ?? {};
  const intro = continuityIntro(item, game);
  const subject = issue.subjectName ?? issue.playerName ?? "el jugador";
  const shortSubject = firstName(subject);
  const kind = renewalResponseKind(item);
  if (kind === "RenewalAccepted") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Ya tenemos respuesta del entorno de ${shortSubject}.\n\nHan aceptado la base de la renovacion. Todavia quedan algunos detalles, pero creo que estamos cerca de cerrarlo.\n\nAhora toca decidir si firmamos, revisamos el contrato o dejamos unos dias de margen.`;
  }
  if (kind === "RenewalRejected") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Ya tenemos respuesta del entorno de ${shortSubject}.\n\nNo aceptan las condiciones actuales. Creen que merece un contrato mejor y, si no nos movemos, la negociacion puede enfriarse rapido.\n\nTenemos que decidir si mejoramos la oferta, mantenemos postura o retiramos la propuesta.`;
  }
  if (kind === "RenewalCounterOffer") {
    return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Nos han enviado una contraoferta por ${shortSubject}.\n\nNo han rechazado la renovacion, pero quieren mejores condiciones antes de avanzar.\n\nPodemos aceptar la peticion, revisar los detalles o ganar unos dias antes de responder.`;
  }
  return `${intro ? `${intro}\n\n` : "Mister...\n\n"}Ya tenemos respuesta del entorno de ${shortSubject}.\n\nLa negociacion ha cambiado de fase y necesita una decision concreta antes de seguir avanzando.`;
}

function sceneMessage(item, actor, game) {
  if (isClubLifeMoment(item)) return clubLifeMomentMessage(item, actor, game);
  if (isRenewalResponseIssue(item)) return renewalResponseMessage(item, game);
  if (item.normalizedIssue) {
    return clubLifeMessage({
      title: item.normalizedIssue.title,
      message: item.normalizedIssue.summary,
      origin: item.normalizedIssue.type,
      person: item.normalizedIssue.subjectName ? { name:item.normalizedIssue.subjectName } : null,
      payload: { playerId:item.normalizedIssue.subjectId },
    }, actor);
  }
  if (item.source === "conversation") return conversationOpening(item.conversation);
  if (item.source === "clubLife") return clubLifeMessage(item.issue, actor);
  return attentionMessage(item.attention, actor);
}

const HUMAN_OPTION_LABELS = {
  promise_minutes: "ðŸ¤ Cuenta conmigo. Vas a tener tu oportunidad.",
  competition: "ðŸ“‹ Ahora mismo hay mucha competencia, pero te estoy mirando.",
  earn_it: "âš ï¸ Te lo tienes que ganar cada semana.",
  final_decision: "ðŸ§± Por ahora la decisiÃ³n no cambia.",
  rest_player: "ðŸ§Š Prefiero protegerlo, aunque nos cueste.",
  lower_load: "ðŸ“‰ Bajamos la carga hoy mismo.",
  take_risk: "ðŸ”¥ Lo necesito. Asumimos el riesgo.",
  listen_group: "ðŸ¤ Voy a escuchar al grupo.",
  captain_help: "â¤ï¸ Necesito que me ayudes desde dentro.",
  performance_first: "âš ï¸ Primero necesitamos rendir.",
  review_market: "ðŸ’¼ Lo reviso ahora contigo.",
  not_for_sale: "ðŸ§± No quiero venderlo.",
  ask_more: "ðŸ’° Si se mueven, que sea con una oferta mejor.",
  protect_players: "ðŸ›¡ï¸ La responsabilidad la asumo yo.",
  demand_reaction: "ðŸ”¥ El equipo tiene que reaccionar.",
  calm_message: "ðŸ•Šï¸ Vamos a mantener la calma.",
  keep_working: "ðŸ¤ Sigue asÃ­. EstÃ¡s siendo importante.",
  team_first: "ðŸ‘¥ Lo importante es que el equipo crezca contigo.",
  apologize: "ðŸ¤ Tienes razÃ³n. Voy a corregirlo.",
  squad_needs: "ðŸ§± El equipo estaba por encima de la promesa.",
  earn_back: "âš ï¸ Necesito verte mejor en los entrenamientos.",
};

function consequenceText(option = {}) {
  if (option.memory) return "Se lleva una promesa. Si no la cumples, volverÃ¡ con otra cara.";
  if (option.tone === "frÃ­o" || option.tone === "duro") return "La frase corta la conversaciÃ³n, pero puede dejar marca.";
  if (option.tone === "arriesgado") return "Acepta la decisiÃ³n, aunque nadie puede garantizar que salga bien.";
  if (option.tone === "protector" || option.tone === "prudente") return "TransmitirÃ¡s calma, aunque quizÃ¡ pierdas algo inmediato.";
  return "La persona sale con una respuesta clara, no con un trÃ¡mite.";
}

function actionLabelFor(actor, actionLabel) {
  if (actor.id === "sportingDirector") return "ðŸ’¼ DÃ©jame hablar con su representante.";
  if (actor.id === "doctor" || actor.id === "fitnessCoach") return "ðŸ§Š Prefiero proteger al jugador.";
  if (actor.id === "assistantCoach") return "ðŸ“‹ Vamos a prepararlo ahora.";
  if (actor.id === "captain") return "ðŸ¤ HablarÃ© con el grupo.";
  if (actor.id === "pressOfficer") return "ðŸŽ™ï¸ Vamos a cuidar el mensaje.";
  if (actor.id === "president") return "ðŸ›ï¸ Lo hablamos con calma, pero hoy.";
  if (actor.id === "academyChief") return "ðŸŒ± Quiero ver ese caso contigo.";
  if (actor.id === "player") return "ðŸ¤ Cuenta con una respuesta clara.";
  return actionLabel ? `ðŸ“‹ ${actionLabel}` : "ðŸ“‹ Voy a estudiarlo ahora.";
}

function reactionFor(actor, option = {}) {
  if (option.type === "postpone") {
    if (actor.id === "player") return `${actor.name} aprieta los labios y asiente sin discutir. No se va enfadado del todo, pero tampoco tranquilo.`;
    if (actor.id === "president") return "El presidente guarda silencio un segundo. Acepta esperar, aunque su mirada deja claro que no por mucho tiempo.";
    return `${actor.name} asiente despacio. La conversaciÃ³n queda aparcada, pero no cerrada.`;
  }
  if (option.type === "delegate") {
    return `${actor.name} toma nota y baja un poco la tensiÃ³n. Sale del despacho con una tarea clara, aunque espera que esta vez haya seguimiento.`;
  }
  if (option.id === "take_risk") return "La respuesta deja el aire mÃ¡s pesado. Nadie discute, pero todos entienden que la decisiÃ³n tiene precio.";
  if (option.id === "final_decision" || option.id === "not_for_sale") return `${actor.name} acepta la firmeza. No parece convencido del todo, pero entiende que no habrÃ¡ debate ahora.`;
  if (actor.id === "doctor") return "El mÃ©dico asiente, todavÃ­a prudente. No sonrÃ­e, pero parece aliviado de que no lo hayas tomado como una simple nota.";
  if (actor.id === "sportingDirector") return "El director deportivo cierra la carpeta y asiente. Ya estÃ¡ pensando en la llamada siguiente.";
  if (actor.id === "captain") return "El capitÃ¡n respira hondo. Agradece que le hayas hablado claro; eso, en el vestuario, pesa.";
  if (actor.id === "pressOfficer") return "La responsable de prensa desbloquea el mÃ³vil y empieza a ordenar el mensaje antes de salir.";
  if (actor.id === "player") return `${actor.name} levanta la mirada. No se marcha con todas las respuestas, pero sÃ­ con la sensaciÃ³n de haber sido escuchado.`;
  return `${actor.name} asiente. "De acuerdo, mÃ­ster. Me pongo con ello y te mantengo informado."`;
}

function expectationDelay(scene, decision, game) {
  const base = game?.matchday ?? 1;
  if (scene?.storyKey?.startsWith("contract_renewal:")) return 1 + (base % 3);
  if (scene?.storyKey?.startsWith("medical:")) return 1 + (base % 2);
  if (scene?.storyKey?.startsWith("youth:")) return 2 + (base % 3);
  if (decision?.type === "postpone") return 1 + (base % 2);
  if (decision?.type === "delegate") return 2 + (base % 3);
  return 0;
}

function expectationCopy(scene) {
  const actorName = scene?.actor?.name ?? "alguien";
  const subject = scene?.original?.normalizedIssue?.subjectName ?? scene?.original?.attention?.playerName ?? scene?.actor?.name;
  if (scene?.storyKey?.startsWith("contract_renewal:")) {
    return {
      reminder: `${actorName} dijo que volverÃ­a cuando tuviera novedades${subject ? ` de ${subject}` : ""}.`,
      returnTitle: `${subject ?? "El jugador"} tiene novedades contractuales`,
      returnSummary: "He vuelto a hablar con su entorno. Ya hay movimiento y necesitamos decidir el siguiente paso.",
      expectedOutcome: "Revisar la novedad contractual.",
      priority: "important",
      origin: "contracts",
    };
  }
  if (scene?.storyKey?.startsWith("medical:")) {
    return {
      reminder: "El mÃ©dico querÃ­a observar la evoluciÃ³n antes de tomar una decisiÃ³n definitiva.",
      returnTitle: "El mÃ©dico trae novedades",
      returnSummary: "Ya tenemos una lectura mÃ¡s clara de la evoluciÃ³n fÃ­sica. Conviene revisarla antes de forzar.",
      expectedOutcome: "Valorar el regreso o el descanso.",
      priority: "important",
      origin: "medical",
    };
  }
  if (scene?.storyKey?.startsWith("youth:")) {
    return {
      reminder: "El jefe de cantera quedÃ³ en seguir observando al chico.",
      returnTitle: "La cantera vuelve con un informe",
      returnSummary: "He seguido mirando su evoluciÃ³n. Creo que ya podemos hablar con mÃ¡s criterio.",
      expectedOutcome: "Decidir el siguiente paso del canterano.",
      priority: "normal",
      origin: "youth",
    };
  }
  return {
    reminder: `${actorName} dejÃ³ este asunto en seguimiento.`,
    returnTitle: "Hay novedades sobre una conversaciÃ³n pendiente",
    returnSummary: "He revisado lo que hablamos. No querÃ­a dejarlo parado sin volver a pasar por tu despacho.",
    expectedOutcome: "Escuchar la novedad y decidir.",
    priority: "normal",
    origin: scene?.source ?? "legacyDirector",
  };
}

export function buildSceneExpectation(scene, decision, game) {
  if (!scene || !decision) return null;
  const shouldWait = decision.type === "postpone"
    || decision.type === "delegate"
    || (decision.id && ["hold_position", "review_contract", "negotiate_terms", "improve_detail"].includes(decision.id));
  if (!shouldWait) return null;
  const delay = expectationDelay(scene, decision, game);
  if (!delay) return null;
  const season = String(game?.season ?? "2025");
  const matchday = (game?.matchday ?? 1) + delay;
  const copy = expectationCopy(scene);
  return {
    ...copy,
    ownerActorId: scene.ownerActorId ?? scene.actor?.id,
    subjectId: scene.original?.normalizedIssue?.subjectId ?? scene.original?.attention?.playerId ?? null,
    subjectName: scene.original?.normalizedIssue?.subjectName ?? scene.original?.attention?.playerName ?? null,
    nextAvailableAt: { season, matchday },
    responseType: scene.original?.normalizedIssue?.responseType ?? null,
    promiseLine: "VolverÃ© cuando tenga novedades.",
  };
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
  if (isRenewalResponseIssue(item)) {
    const screen = item.attention?.action?.screen ?? "contracts";
    const kind = renewalResponseKind(item);
    const base = kind === "RenewalAccepted"
      ? [
          ["close_renewal", "Cerrar acuerdo", "Firmas la renovacion si las condiciones siguen encajando."],
          ["review_contract", "Revisar contrato", "Abres la negociacion para comprobar todos los detalles."],
          ["improve_detail", "Mejorar algun detalle", "Puedes reforzar la relacion sin reabrir todo el pulso."],
        ]
      : kind === "RenewalRejected"
        ? [
            ["improve_offer", "Mejorar oferta", "Intentas desbloquear la negociacion con mejores condiciones."],
            ["hold_position", "Mantener postura", "El club no se mueve todavia; la tension puede crecer."],
            ["withdraw_offer", "Retirar oferta", "Cierras esta via y asumes el impacto en la relacion."],
          ]
        : [
            ["accept_counter", "Aceptar peticion", "Aceptas la contraoferta para acercar la firma."],
            ["negotiate_terms", "Revisar condiciones", "Abres contratos para ajustar salario, anos o rol."],
            ["hold_position", "Mantener oferta", "El club no se mueve todavia; la otra parte puede impacientarse."],
          ];
    return [
      ...base.map(([id, label, consequence]) => ({ id, label, tone:"contractual", type:"act", navigateTo:screen, consequence, reaction:reactionFor(actor, { id, type:"act" }) })),
      { id:"postpone", label:"Esperar unos dias", tone:"prudente", type:"postpone", consequence:"Ganas margen, pero la negociacion puede volver con mas tension.", reaction:reactionFor(actor, { id:"postpone", type:"postpone" }) },
    ];
  }
  if (isClubLifeMoment(item)) {
    const momentType = item.normalizedIssue?.momentType ?? item.attention?.momentType;
    if (String(momentType ?? "").startsWith("locker_")) {
      const subjectId = item.normalizedIssue?.subjectId ?? item.attention?.playerId ?? item.attention?.subjectId ?? null;
      const subjectName = item.normalizedIssue?.subjectName ?? item.attention?.playerName ?? item.attention?.subjectName ?? "el jugador";
      return [
        {
          id:"praise_locker_moment",
          label:"Felicitar",
          tone:"cercano",
          type:"act",
          navigateTo:"dashboard",
          lockerEffect:{ subjectId, subjectName, morale:2, trust:1, eventLabel:"El mister reconocio su actitud" },
          consequence:"Refuerzas una dinamica positiva sin convertirla en una reunion grande.",
          reaction:`${actor.name} sonrie un poco. A veces una frase corta del entrenador vale mas que una charla larga.`,
        },
        {
          id:"talk_player_locker",
          label:"Hablar con el jugador",
          tone:"personal",
          type:"act",
          navigateTo:"lockerRoom",
          lockerEffect:{ subjectId, subjectName, morale:1, trust:3, eventLabel:"El mister se acerco a hablar con el" },
          consequence:"Te acercas al jugador y haces que se sienta visto.",
          reaction:`${actor.name} asiente. No era un problema, pero el gesto puede quedarse dentro del grupo.`,
        },
        {
          id:"captain_handles_locker",
          label:"Que lo gestione el capitan",
          tone:"delegar",
          type:"act",
          navigateTo:"dashboard",
          lockerEffect:{ teamMorale:1, eventLabel:"El capitan reforzo el ambiente del grupo" },
          consequence:"Das espacio a los lideres del vestuario para construir grupo.",
          reaction:`${actor.name} lo entiende enseguida. Hay cosas que, si las lleva el vestuario, pesan mas.`,
        },
        {
          id:"do_not_intervene_locker",
          label:"No intervenir",
          tone:"prudente",
          type:"act",
          navigateTo:"dashboard",
          consequence:"Dejas que el momento siga su curso sin convertirlo en una orden.",
          reaction:`${actor.name} acepta la decision. A veces el entrenador tambien dirige dejando respirar.`,
        },
      ];
    }
    if (String(momentType ?? "").startsWith("world_")) {
      const target = item.attention?.action?.screen ?? item.normalizedIssue?.action?.screen ?? "dashboard";
      const actorName = actor.name ?? "La persona";
      return [
        {
          id:"own_message",
          label:"Mantengo mi idea",
          tone:"firme",
          type:"act",
          navigateTo:"dashboard",
          consequence:"El club transmite una linea clara sin sobreactuar.",
          reaction:`${actorName} toma nota. La respuesta no busca gustar a todos, pero si marcar una direccion reconocible.`,
        },
        {
          id:"adapt_message",
          label:"Hemos tenido que adaptarnos",
          tone:"realista",
          type:"act",
          navigateTo:target,
          consequence:"Aceptas el contexto exterior y ajustas el mensaje sin perder el control.",
          reaction:`${actorName} asiente despacio. Es una respuesta manejable: reconoce el ruido sin entregarle el volante.`,
        },
        {
          id:"avoid_noise",
          label:"No voy a alimentar el ruido",
          tone:"prudente",
          type:"act",
          navigateTo:"dashboard",
          consequence:"Rebajas el foco mediatico y proteges al grupo.",
          reaction:`${actorName} cierra la carpeta. A veces no dar una frase grande tambien es una decision.`,
        },
      ];
    }
    if (String(momentType ?? "").startsWith("weekly_")) {
      const target = item.attention?.action?.screen ?? item.normalizedIssue?.action?.screen ?? "dashboard";
      const actionLabel = item.attention?.actionLabel ?? item.normalizedIssue?.availableActions?.[0] ?? "Revisar";
      if (momentType === "weekly_training_focus") {
        const recommendedFocus = item.attention?.recommendedFocus ?? "recovery";
        const recommendedLoad = item.attention?.recommendedLoad ?? (recommendedFocus === "recovery" ? "low" : "medium");
        return [
          {
            id:"follow_training_recommendation",
            label:"Seguir recomendacion",
            tone:"preparacion",
            type:"act",
            navigateTo:"dashboard",
            trainingPlan:{ weeklyFocus:recommendedFocus, load:recommendedLoad },
            consequence:"El cuerpo tecnico adapta la semana sin pedirte mas gestion.",
            reaction:`${actor.name} asiente. El staff ya sabe hacia donde orientar el trabajo diario.`,
          },
          {
            id:"keep_training_plan",
            label:"Mantener plan",
            tone:"sereno",
            type:"act",
            navigateTo:"dashboard",
            consequence:"No cambias el rumbo de la semana.",
            reaction:`${actor.name} toma nota. Mantener una idea tambien es preparar el partido.`,
          },
          {
            id:"very_intense_training",
            label:"Entrenamiento muy intenso",
            tone:"exigente",
            type:"act",
            navigateTo:"dashboard",
            trainingPlan:{ weeklyFocus:"highPress", load:"veryHigh" },
            consequence:"Aumenta la intensidad, pero tambien la carga y el riesgo fisico.",
            reaction:`${actor.name} no discute, pero deja claro que vigilara las piernas de cerca.`,
          },
        ];
      }
      return [
        {
          id:"continue_plan",
          label:"Continuar con el plan",
          tone:"sereno",
          type:"act",
          navigateTo:"dashboard",
          consequence:"Das continuidad a la semana sin cambiar el foco.",
          reaction:`${actor.name} asiente. No todo necesita giro; a veces preparar tambien es sostener una idea.`,
        },
        {
          id:"adjust_focus",
          label:actionLabel,
          tone:"preparacion",
          type:"act",
          navigateTo:target,
          consequence:"Abres el area relacionada para ajustar el enfoque antes del partido.",
          reaction:`${actor.name} abre la carpeta de nuevo. La semana cambia un poco de direccion, pero con sentido.`,
        },
        {
          id:"no_intervention",
          label:"No intervenir por ahora",
          tone:"prudente",
          type:"act",
          navigateTo:"dashboard",
          consequence:"El club sigue trabajando sin una orden nueva del entrenador.",
          reaction:`${actor.name} entiende la respuesta. No parece una negativa, sino una forma de no tocar lo que funciona.`,
        },
      ];
    }
    return [{
      id:"thanks",
      label:"Gracias por venir a contarmelo",
      tone:"cercano",
      type:"act",
      navigateTo:"dashboard",
      consequence:"No todo queda en una decision. A veces escuchar tambien construye vestuario.",
      reaction:`${actor.name} asiente con una media sonrisa. No era una reunion larga; era una pequena pieza mas de confianza.`,
    }];
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
      label: "â³ Necesito un poco mÃ¡s de tiempo.",
      tone: "prudente",
      type: "postpone",
      consequence: "Ganas margen, pero el asunto puede volver con mÃ¡s tensiÃ³n.",
    },
    {
      id: "delegate",
      label: "ðŸ¤ TÃº llÃ©valo de cerca y me avisas.",
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
  const issue = item.normalizedIssue ?? item.issue ?? item.conversation ?? item.attention ?? {};
  const matchday = game?.matchday ?? 1;
  const issueKey = sceneIssueKey(item);
  const storyKey = storyKeyFromItem(item);
  return {
    id: `scene:${item.id}`,
    sourceItemId: item.id,
    rawId: item.rawId,
    issueKey,
    storyKey,
    ownerActorId: item.normalizedIssue?.ownerId ?? actor.id,
    relatedItemIds: item.related ?? [item.id],
    source: item.source,
    actor,
    title: issue.title ?? item.attention?.title ?? "Una conversaciÃ³n en el despacho",
    location: "Despacho del entrenador",
    time: timeOfDay(matchday),
    officeDetail: officeDetail(matchday),
    emotionalState: emotionalLabel(issue.emotionalState ?? issue.priority ?? item.priority),
    message: sceneMessage(item, actor, game),
    consequenceIfIgnored: naturalFallback(issue.consequenceIfIgnored ?? item.consequenceIfIgnored ?? item.consequence ?? "La situaciÃ³n puede volver mÃ¡s adelante con otro tono."),
    expectedOutcome: naturalFallback(issue.goal ?? issue.expectedOutcome ?? "Que el entrenador marque una lÃ­nea clara."),
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
          issueKey: scene.issueKey ?? null,
          storyKey: scene.storyKey ?? null,
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
