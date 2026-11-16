# Prévia celular + computador

Uma página para ver um site em dois tamanhos ao mesmo tempo, feita para monitor em pé (retrato):
**celular em cima** e **computador embaixo**, cada um com a resolução que você escolher.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `previa.html` | A página da prévia: escolhe o site e a página, os tamanhos de tela, gira e recarrega. |
| `abrir-previa.ps1` | Abre a prévia num Edge separado, maximizada no monitor em pé. |
| `controlar.js` | "Controle remoto" pelo Playwright: muda tamanho, abre página, clica e tira foto. |

## Como abrir

```powershell
powershell -ExecutionPolicy Bypass -File abrir-previa.ps1
```

A janela usa um perfil do Edge só dela (guardado em `AppData\Local\previa-celular-pc`, fora desta pasta).
Na primeira vez, entre no site com o seu login; ele fica guardado nessa janela.

## Controle pelo Playwright

Com a prévia aberta (ela libera a porta de controle 9333, só deste PC):

```powershell
node controlar.js abrir Lista-Sabado.html     # abre a página nos dois aparelhos
node controlar.js site local                  # ar | local | emulador
node controlar.js celular 412 915             # resolução do celular
node controlar.js pc 1920 1080                # resolução do computador
node controlar.js divisao 40                  # % da altura para o celular
node controlar.js clicar celular "Entrar"     # clica num texto dentro do celular (ou pc)
node controlar.js foto previa.png             # foto da janela inteira
node controlar.js foto-aparelho celular       # foto só da tela do celular (ou pc)
```

Precisa do Playwright instalado no PC (`npm install -g playwright`).

## Bom saber

- Clicar num link dentro de um aparelho não muda o outro; use "Abrir nos dois".
- As barras de rolagem ficam escondidas, porque no celular elas não ocupam espaço.
