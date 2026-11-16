// Controla a janela da prévia com o Playwright, pela porta 9333 (aberta pelo abrir-previa.ps1).
// Exemplos:
//   node controlar.js abrir https://admdf.site/Portal.html   abre o endereço nos dois aparelhos
//   node controlar.js abrir Lista-Sabado.html                só a página: abre no mesmo site
//   node controlar.js modelos                                lista os modelos de celular e computador
//   node controlar.js celular iphone-15                      troca o celular por um modelo da lista
//   node controlar.js celular 412 915                        ou por uma resolução qualquer
//   node controlar.js pc mon-1920                            mesmo para o computador (modelo ou L A)
//   node controlar.js girar celular                          deita / levanta (celular ou pc)
//   node controlar.js arrumacao lado                         auto | empilhado | lado
//   node controlar.js divisao 40                             % do espaço para o celular
//   node controlar.js clicar celular "Entrar"                clica num texto dentro do celular (ou pc)
//   node controlar.js foto [arquivo.png]                     foto da janela inteira
//   node controlar.js foto-aparelho celular [arquivo.png]    foto só da tela do celular (ou pc)
const path = require("node:path");
const { execSync } = require("node:child_process");
const { createRequire } = require("node:module");

// O Playwright está instalado "globalmente" (para o PC todo); createRequire busca o pacote naquela pasta.
const globalRoot = execSync("npm root -g").toString().trim();
const { chromium } = createRequire(path.join(globalRoot, "noop.js"))("playwright");

const [command, ...args] = process.argv.slice(2);
const KIND = { celular: "phone", phone: "phone", pc: "desk", computador: "desk", desk: "desk" };
const LAYOUT = { auto: "auto", automatica: "auto", empilhado: "stack", stack: "stack", lado: "side", side: "side" };

(async () => {
  // connectOverCDP "pendura" o Playwright numa janela que já está aberta (não abre outra).
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const page = browser.contexts().flatMap((context) => context.pages()).find((item) => item.url().endsWith("previa.html"));
  if (!page) throw new Error("Janela da prévia não encontrada. Rode o abrir-previa.ps1.");

  // A página expõe window.previa (veja o fim do previa.html): chamamos as funções dela direto.
  const call = (name, ...values) => page.evaluate(({ name, values }) => window.previa[name](...values), { name, values });

  if (command === "abrir") {
    await call("abrir", args.join(" "));
  } else if (command === "modelos") {
    console.log(await call("modelos"));
  } else if (command in KIND) {
    const kind = KIND[command];
    // Dois números = resolução; um nome = modelo da lista.
    const ok = args.length >= 2 ? await call("tamanho", kind, args[0], args[1]) : await call("modelo", kind, args[0]);
    if (!ok) throw new Error(`Não reconheci "${args.join(" ")}". Veja: node controlar.js modelos`);
  } else if (command === "girar") {
    await call("girar", KIND[args[0]] || "phone");
  } else if (command === "arrumacao") {
    await call("arrumacao", LAYOUT[args[0]] || "auto");
  } else if (command === "divisao") {
    await call("divisao", args[0]);
  } else if (command === "clicar") {
    // frameLocator entra no iframe do aparelho; getByText acha o texto visível e clica.
    await page.frameLocator(`[data-frame=${KIND[args[0]]}]`).getByText(args[1], { exact: false }).first().click();
  } else if (command === "foto") {
    const file = path.resolve(args[0] || "previa.png");
    await page.screenshot({ path: file });
    console.log(file);
  } else if (command === "foto-aparelho") {
    // Foto só da tela do aparelho (sem a moldura), do jeito que aparece na prévia.
    const file = path.resolve(args[1] || `previa-${args[0]}.png`);
    await page.locator(`[data-frame=${KIND[args[0]]}]`).screenshot({ path: file });
    console.log(file);
  } else {
    console.log("Comandos: abrir, modelos, celular, pc, girar, arrumacao, divisao, clicar, foto, foto-aparelho (veja o começo do arquivo).");
  }
  console.log("ok:", command || "", args.join(" "));
  // Sai sem fechar nada: a janela continua aberta para você (o Playwright só "solta" a conexão).
  process.exit(0);
})().catch((error) => { console.error(error.message); process.exit(1); });
