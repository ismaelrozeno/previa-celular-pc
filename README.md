<p align="center"><img src="icone.svg" width="96" alt="Ícone da Prévia"></p>

<h1 align="center">Prévia · celular + computador</h1>

<p align="center">Veja um site num celular e num computador <b>ao mesmo tempo</b>, com aparelhos parecidos com os de verdade.</p>

---

## O que dá para fazer

- **Celulares de verdade:** iPhone SE (com botão), iPhone 13 mini e 14 (com notch), iPhone 15/16 (com a ilha),
  Galaxy, Moto G, Redmi, Pixel, Galaxy Z Fold e tablets (iPad mini, iPad Air, Galaxy Tab).
- **Computador com moldura:** notebook (com teclado embaixo) ou monitor (com pé), do 1280×720 ao 4K e ultrawide.
- **Qualquer resolução:** digite a largura e a altura que quiser (vira "Personalizado").
- **Girar:** deita o celular ou deixa o monitor em pé.
- **Cores do aparelho:** grafite, prata, titânio, azul, verde e rosa.
- **Barras de verdade:** barra de status (hora e bateria), a faixa de baixo do iPhone e a barra do navegador com o
  endereço — o site fica só com o espaço que sobra, como no aparelho. Dá para desligar ("Barras" / "Navegador").
- **Sem moldura:** mostra só a tela.
- **Arrumação automática:** monitor em pé = um em cima do outro; monitor deitado = lado a lado.
- **Lembra de tudo:** ao reabrir, volta com o último site, os modelos e as opções.

## Como abrir

Dois cliques no atalho **Prévia** da Área de Trabalho. Para criar o atalho (uma vez só):

```powershell
powershell -ExecutionPolicy Bypass -File criar-atalho.ps1
```

Ou abra direto:

```powershell
powershell -ExecutionPolicy Bypass -File abrir-previa.ps1
```

A prévia abre num Edge separado, maximizada (no monitor em pé, se houver). Ela usa um perfil do Edge só dela,
guardado em `AppData\Local\previa-celular-pc` — **fora desta pasta**, porque guarda logins. Na primeira vez,
entre no site com o seu login; ele fica guardado nessa janela.

Digite o endereço no campo de cima e aperte **Enter**. Só o nome da página (ex.: `Portal.html`) abre no mesmo
site que já está aberto.

## Controle pelo Playwright

Com a prévia aberta (ela libera uma porta de controle, a 9333, só para este PC):

```powershell
node controlar.js abrir https://admdf.site/Portal.html   # abre nos dois aparelhos
node controlar.js modelos                                # lista os modelos
node controlar.js celular iphone-15                      # troca o celular (modelo ou: celular 412 915)
node controlar.js pc mon-1920                            # troca o computador (modelo ou: pc 1920 1080)
node controlar.js girar celular                          # deita / levanta
node controlar.js arrumacao lado                         # auto | empilhado | lado
node controlar.js divisao 40                             # % do espaço para o celular
node controlar.js clicar celular "Entrar"                # clica num texto dentro do aparelho
node controlar.js foto previa.png                        # foto da janela inteira
node controlar.js foto-aparelho celular                  # foto só da tela do aparelho
```

Precisa do [Node.js](https://nodejs.org) e do Playwright instalados (`npm install -g playwright`).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `previa.html` | A prévia em si (página única, sem instalar nada). |
| `abrir-previa.ps1` | Abre a prévia no Edge (ou traz para frente, se já estiver aberta). |
| `criar-atalho.ps1` | Cria o atalho "Prévia" na Área de Trabalho, com o ícone. |
| `controlar.js` | Controle remoto pelo Playwright. |
| `icone.svg` / `icone.ico` | O ícone. |

## Bom saber

- Clicar num link dentro de um aparelho não muda o outro; use **Abrir** para trocar os dois juntos.
- Alguns sites (Google, bancos, redes sociais) não deixam ser abertos dentro de outra página; nesses, o aparelho
  fica em branco ou mostra um erro. Sites próprios e a maioria dos sites simples funcionam.
- As barras de rolagem ficam escondidas, porque no celular elas não ocupam espaço.
