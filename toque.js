// Ajudante do "Toque": faz o clique do mouse no celular da prévia virar toque de dedo de verdade.
//
// Como funciona:
// - O site dentro do quadro do celular é de outro endereço, então a página da prévia não consegue mandar
//   eventos para dentro dele. Este ajudante fala com o Edge pela porta de controle (9333), igual ao
//   controlar.js, e manda os toques direto para o quadro do celular (Input.dispatchTouchEvent).
// - A prévia põe uma camada transparente por cima do celular; ela pega o mouse e chama window.__previaToque
//   (uma "ponte" criada aqui com Runtime.addBinding). Sem este ajudante, a camada some e o clique é de mouse.
// - Para o site do celular se ver como "tela de toque", colocamos um script só nele (TOUCH_SCRIPT, abaixo):
//   navigator.maxTouchPoints = 5, "ontouchstart" existe e matchMedia responde (pointer: coarse) e (hover: none).
// - A emulação completa do Edge (que muda também o @media do CSS) só entra em "Só o celular": quando o
//   celular e o computador mostram o mesmo site, eles dividem o mesmo processo do Edge e a emulação
//   vazaria para o computador.
//
// O abrir-previa.ps1 já liga este ajudante escondido. Para ligar na mão: node toque.js
// Só um roda por vez (ele "segura" a porta 9334; se já estiver ocupada, sai quieto).
// Fecha sozinho quando a janela da prévia (o Edge dela) fecha.
const net = require("node:net");

const PORTA = Number(process.env.PREVIA_PORTA || 9333);
const BASE = `http://127.0.0.1:${PORTA}`;
const log = (...values) => { if (process.env.PREVIA_LOG) console.log(new Date().toISOString().slice(11, 19), ...values); };

// Roda dentro do site do celular antes dos scripts dele.
const TOUCH_SCRIPT = `(() => {
  try { Object.defineProperty(Navigator.prototype, "maxTouchPoints", { get: () => 5, configurable: true }); } catch {}
  // el.ontouchstart = função: vira um addEventListener de verdade.
  const handlers = new WeakMap();
  for (const name of ["ontouchstart", "ontouchmove", "ontouchend", "ontouchcancel"]) {
    for (const target of [window, Document.prototype, HTMLElement.prototype]) {
      if (name in target) continue;
      Object.defineProperty(target, name, { configurable: true, enumerable: true,
        get() { return (handlers.get(this) || {})[name] || null; },
        set(fn) {
          const own = handlers.get(this) || {}; handlers.set(this, own);
          if (own[name]) this.removeEventListener(name.slice(2), own[name]);
          own[name] = typeof fn === "function" ? fn : null;
          if (own[name]) this.addEventListener(name.slice(2), own[name]);
        } });
    }
  }
  // matchMedia: troca (pointer...) e (hover...) por uma condição que dá sempre certo ou sempre errado.
  const YES = "(min-width: 0px)", NO = "(min-resolution: 1000000dppx)";
  const answers = { "pointer": YES, "pointer:coarse": YES, "pointer:fine": NO, "pointer:none": NO,
    "hover": NO, "hover:hover": NO, "hover:none": YES };
  const fix = (query) => String(query).replace(/\\(\\s*(?:any-)?(pointer|hover)\\s*(?::\\s*([a-z]+)\\s*)?\\)/gi,
    (all, feature, value) => answers[feature.toLowerCase() + (value ? ":" + value.toLowerCase() : "")] || all);
  const original = window.matchMedia.bind(window);
  window.matchMedia = function matchMedia(query) {
    const list = original(fix(query));
    try { Object.defineProperty(list, "media", { value: String(query) }); } catch {}
    return list;
  };
})();`;

net.createServer().once("error", () => process.exit(0)).listen(PORTA + 1, "127.0.0.1", () => start().catch((error) => {
  console.error(error.message);
  process.exit(1);
}));

async function start() {
  // Espera o Edge da prévia abrir (até 1 minuto).
  let version;
  for (let i = 0; i < 120 && !version; i++) {
    try { version = await (await fetch(`${BASE}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  if (!version) throw new Error(`O Edge da prévia não respondeu na porta ${PORTA}.`);

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onclose = () => process.exit(0);

  // ---------- Conversa com o Edge (protocolo do DevTools) ----------
  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); return; }
    onEvent(msg).catch((error) => log("erro:", error.message));
  };
  const reload = (session) => session && send("Runtime.evaluate", { expression: "location.reload()" }, session);

  // on = caixinha "Toque" marcada; phoneOnly = arrumação "Só o celular".
  const state = { pageId: null, page: null, phone: null, desk: null, script: null, on: true, phoneOnly: false, emulating: false };
  const clearPage = () => Object.assign(state, { pageId: null, page: null, phone: null, desk: null, script: null, emulating: false });

  // Põe ou tira o script de toque do celular (vale a partir do próximo carregamento do site).
  async function applyScript() {
    if (!state.phone) return;
    if (state.on && !state.script) {
      await send("Page.enable", {}, state.phone);
      const added = await send("Page.addScriptToEvaluateOnNewDocument", { source: TOUCH_SCRIPT }, state.phone);
      state.script = added.result?.identifier || null;
    } else if (!state.on && state.script) {
      await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: state.script }, state.phone);
      state.script = null;
    }
  }
  // Emulação completa do Edge: só com o computador fora da tela (senão vazaria para ele).
  async function applyEmulation() {
    const want = !!(state.on && state.phoneOnly && state.phone);
    if (want === state.emulating) return;
    state.emulating = want;
    if (state.phone) await send("Emulation.setTouchEmulationEnabled", want ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }, state.phone);
    // O computador pode ter carregado enquanto a emulação estava ligada: recarrega para ele voltar ao normal.
    if (!want) await reload(state.desk);
    log("emulação completa:", want);
  }

  // Qual quadro é este? Pergunta à prévia qual <iframe> é o "dono" e lê o data-frame (phone ou desk).
  async function frameKind(frameId) {
    const owner = await send("DOM.getFrameOwner", { frameId }, state.page);
    if (!owner.result) return "";
    const node = await send("DOM.describeNode", { backendNodeId: owner.result.backendNodeId }, state.page);
    const attrs = node.result?.node?.attributes || [];
    const index = attrs.indexOf("data-frame");
    return index >= 0 ? attrs[index + 1] : "";
  }

  async function attachPage(targetId) {
    if (state.pageId === targetId) return;
    state.pageId = targetId;
    const attached = await send("Target.attachToTarget", { targetId, flatten: true });
    state.page = attached.result?.sessionId;
    if (!state.page) { state.pageId = null; return; }
    await send("DOM.enable", {}, state.page);
    await send("Runtime.enable", {}, state.page);
    await send("Runtime.addBinding", { name: "__previaToque" }, state.page);
    // Avisa quando um quadro abre; o quadro novo fica parado até a gente configurar (assim o script de
    // toque roda antes dos scripts do site) e depois mandamos seguir.
    await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, state.page);
    log("prévia encontrada");
  }

  async function findPage() {
    const { result } = await send("Target.getTargets");
    const page = result.targetInfos.find((t) => t.type === "page" && t.url.includes("previa.html"));
    if (page) await attachPage(page.targetId);
  }

  // Fila: os toques chegam em ordem e vão para o Edge na mesma ordem (início, movimentos, fim).
  let queue = Promise.resolve();
  const enqueue = (job) => { queue = queue.then(job).catch((error) => log("erro:", error.message)); };

  async function onMessage(msg) {
    if (msg.t === "modo") {
      // (O sinal de vida pode ter percebido a mudança antes; aí já está feito.)
      if (state.on === !!msg.ligado) return;
      state.on = !!msg.ligado;
      await applyScript();
      await applyEmulation();
      // Recarrega o site do celular (na página em que ele está) para ele perceber a mudança logo ao abrir.
      await reload(state.phone);
      return;
    }
    if (!state.phone) return;
    const point = { x: msg.x, y: msg.y, radiusX: 6, radiusY: 6, force: 1, id: 0 };
    if (msg.t === "start") await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }, state.phone);
    else if (msg.t === "move") await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] }, state.phone);
    else if (msg.t === "end") await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }, state.phone);
    else if (msg.t === "cancel") await send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }, state.phone);
    // Rodinha do mouse: continua rolando a página do celular.
    else if (msg.t === "wheel") await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: msg.x, y: msg.y, deltaX: msg.dx, deltaY: msg.dy }, state.phone);
  }

  async function onEvent(msg) {
    const { method, params, sessionId } = msg;
    if (method === "Target.targetCreated" || method === "Target.targetInfoChanged") {
      if (!state.page && params.targetInfo.type === "page" && params.targetInfo.url.includes("previa.html")) await attachPage(params.targetInfo.targetId);
    } else if (method === "Target.targetDestroyed" && params.targetId === state.pageId) {
      clearPage();
    } else if (method === "Target.attachedToTarget" && sessionId === state.page) {
      const child = params.sessionId;
      const kind = params.targetInfo.type === "iframe" ? await frameKind(params.targetInfo.targetId) : "";
      if (kind === "phone") {
        Object.assign(state, { phone: child, script: null, emulating: false });
        await applyScript();
        await applyEmulation();
        log("celular:", params.targetInfo.url);
      } else if (kind === "desk") {
        state.desk = child;
      }
      await send("Runtime.runIfWaitingForDebugger", {}, child);
    } else if (method === "Target.detachedFromTarget") {
      if (sessionId === state.page && params.sessionId === state.phone) Object.assign(state, { phone: null, script: null, emulating: false });
      if (sessionId === state.page && params.sessionId === state.desk) state.desk = null;
      if (!sessionId && params.sessionId === state.page) clearPage();
    } else if (method === "Runtime.bindingCalled" && sessionId === state.page && params.name === "__previaToque") {
      const data = JSON.parse(params.payload);
      enqueue(() => onMessage(data));
    }
  }

  await send("Target.setDiscoverTargets", { discover: true });
  await findPage();

  // Sinal de vida a cada 1,5 s: a prévia só mostra a camada de toque enquanto recebe este sinal.
  // A resposta diz se a caixinha "Toque" está marcada e se a arrumação é "Só o celular".
  setInterval(async () => {
    if (!state.page) return;
    const reply = await send("Runtime.evaluate", {
      expression: `window.previa && window.previa.toqueVivo ? window.previa.toqueVivo(${!!state.phone}) : null`, returnByValue: true
    }, state.page);
    if (!reply.result || reply.result.exceptionDetails) return;
    const value = reply.result.result?.value;
    // Prévia antiga (sem a caixinha Toque): tira o script de toque e não mexe em mais nada.
    if (!value || typeof value !== "object") {
      if (state.on) { state.on = false; enqueue(async () => { await applyScript(); await applyEmulation(); }); }
      return;
    }
    const on = !!value.ligado, phoneOnly = !!value.soCelular;
    if (on !== state.on || phoneOnly !== state.phoneOnly) {
      const scriptChanged = on !== state.on;
      Object.assign(state, { on, phoneOnly });
      enqueue(async () => { await applyScript(); await applyEmulation(); if (scriptChanged) await reload(state.phone); });
    }
  }, 1500);
}
