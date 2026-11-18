# Abre um app React Native (Expo) dentro da prévia, no celular, com um clique.
# 1. Se o servidor do Expo ainda não estiver ligado, liga numa janela minimizada (fechar essa janela desliga o app).
# 2. Abre a prévia (ou traz para frente) e manda ela abrir o app, mostrando só o celular.
# O Expo gera uma versão web do app: é ela que aparece na prévia. Fica bem perto do app de verdade, mas a
# conferência final é sempre no iPhone, pelo aplicativo Expo Go.
#
# Uso: powershell -ExecutionPolicy Bypass -File abrir-app-expo.ps1
#      powershell -ExecutionPolicy Bypass -File abrir-app-expo.ps1 -Pasta "C:\caminho\do\app" -Porta 8095 -Nome "Meu app"
# (a porta 8081, a padrão do Expo, já é usada pelo banco de teste do Portal; por isso a 8095)

param(
  [string]$Pasta = (Join-Path $env:USERPROFILE "Documents\app-treino"),
  [int]$Porta = 8095,
  [string]$Nome = "App de Treino"
)

$previa = Split-Path -Parent $MyInvocation.MyCommand.Path
$endereco = "http://localhost:$Porta"

# Responde na porta? (Invoke-WebRequest pede a página; se der erro, o servidor ainda não está no ar)
function Respondendo($url) {
  try { (Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

# ---------- 1. Servidor do Expo ----------
if (-not (Respondendo $endereco)) {
  if (-not (Test-Path (Join-Path $Pasta "package.json"))) { "Não achei o app em: $Pasta"; exit 1 }
  # Janela própria e minimizada, com título: dá para ver os erros do app nela, e fechar desliga o servidor.
  $comando = "`$Host.UI.RawUI.WindowTitle = 'Expo · $Nome (feche para desligar)'; Set-Location '$Pasta'; npx expo start --web --port $Porta"
  Start-Process powershell.exe -ArgumentList @("-NoProfile", "-NoExit", "-Command", $comando) -WindowStyle Minimized
  # Espera o primeiro carregamento (a 1ª vez demora mais: o Expo monta o app inteiro)
  for ($i = 0; $i -lt 90 -and -not (Respondendo $endereco); $i++) { Start-Sleep -Seconds 2 }
  if (-not (Respondendo $endereco)) { "O servidor do Expo não respondeu em $endereco. Veja a janela 'Expo · $Nome'."; exit 1 }
}

# ---------- 2. Prévia ----------
& (Join-Path $previa "abrir-previa.ps1") | Out-Null
# Espera a porta de controle da prévia (9333) e manda abrir o app só no celular
for ($i = 0; $i -lt 30 -and -not (Respondendo "http://127.0.0.1:9333/json/version"); $i++) { Start-Sleep -Milliseconds 500 }
Push-Location $previa
node controlar.js abrir $endereco | Out-Null
node controlar.js arrumacao celular | Out-Null
Pop-Location
"$Nome aberto na prévia ($endereco). Para desligar o app, feche a janela 'Expo · $Nome'."
