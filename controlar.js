// Controla a janela da prévia com o Playwright, pela porta 9333 (aberta pelo abrir-previa.ps1).
// Exemplos:
//   node controlar.js abrir Lista-Sabado.html      abre a página nos dois aparelhos
//   node controlar.js site local|emulador|ar        troca o site (teste local, emulador ou admdf.site)
//   node controlar.js celular 412 915               muda a resolução do celular
//   node controlar.js pc 1920 1080                  muda a resolução do computador
//   node controlar.js divisao 40                    % da altura para o celular
//   node controlar.js clicar celular "Entrar"       clica num texto dentro do celular (ou pc)
//   node controlar.js foto [arquivo.png]            tira uma foto da janela inteira
//   node controlar.js foto-aparelho celular [arq]   foto só do celular (ou pc), em tamanho real
const path = require("node:path");
const { execSync } = require("node:child_process");
const { createRequire } = require("node:module");

// O Playwright está instalado "globalmente" (para o PC todo); createRequire busca o pacote naquela pasta.
const globalRoot = execSync("npm root -g").toString().trim();
const { chromium } = createRequire(path.join(globalRoot, "noop.js"))("playwright");

const [command, ...args] = process.argv.slice(2);
const KIND = { celular: "phone", phone: "phone", pc: "desk", computador: "desk", desk: "desk" };
const SITES = { ar: "https://admdf.site/", local: "http://localhost:8091/", emulador: "http://localhost:8091/?emulador=1" };

(async () => {
  // connectOverCDP "pendura" o Playwright numa janela que já está aberta (não abre outra).
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
  const page = browser.contexts().flatMap((context) => context.pages()).find((item) => item.url().endsWith("previa.html"));
  if (!page) throw new Error("Janela da prévia não encontrada. Rode o abrir-previa.ps1.");

  // Preenche um campo da barra e avisa a página que ele mudou (como se a pessoa tivesse digitado).
  const setField = (selector, value) => page.locator(selector).evaluate((element, v) => {
    element.value = v;
    element.dispatchEvent(new Event(element.type === "range" ? "input" : "change", { bubbles: true }));
  }, String(value));

  if (command === "abrir") {
    await page.fill("#path", args[0] || "index.html");
    await page.click("#open");
  } else if (command === "site") {
    await setField("#base", SITES[args[0]] || args[0]);
  } else if (command in KIND) {
    const kind = KIND[command];
    await setField(`[data-w=${kind}]`, args[0]);
    await setField(`[data-h=${kind}]`, args[1]);
  } else if (command === "divisao") {
    await setField("#split", args[0]);
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
    console.log("Comandos: abrir, site, celular, pc, divisao, clicar, foto, foto-aparelho (veja o começo do arquivo).");
  }
  console.log("ok:", command, args.join(" "));
  // Sai sem fechar nada: a janela continua aberta para você (o Playwright só "solta" a conexão).
  process.exit(0);
})().catch((error) => { console.error(error.message); process.exit(1); });
