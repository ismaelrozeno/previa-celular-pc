# Abre a prévia (celular em cima, computador embaixo) no monitor em pé, num Edge separado.
# - Perfil próprio do Edge: não mistura com o seu Edge de trabalho; o login feito aqui fica guardado só nesta
#   janela. O perfil fica FORA desta pasta (em AppData\Local\previa-celular-pc), porque guarda logins e
#   nunca pode ir para o GitHub.
# - Porta de controle 9333 (só deste PC, 127.0.0.1): é por ela que o Playwright comanda a janela.
# Uso: powershell -ExecutionPolicy Bypass -File abrir-previa.ps1

$pasta  = Split-Path -Parent $MyInvocation.MyCommand.Path
# O endereço não pode ter espaço ("Milhor do BR"): [uri] troca o espaço por %20.
$pagina = ([uri](Join-Path $pasta "previa.html")).AbsoluteUri
$perfil = Join-Path $env:LOCALAPPDATA "previa-celular-pc\perfil-edge"
$edge   = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
            "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1

# Acha o monitor em pé (mais alto que largo). Se não houver, usa o principal.
Add-Type -AssemblyName System.Windows.Forms
$telas  = [System.Windows.Forms.Screen]::AllScreens
$retrato = $telas | Where-Object { $_.Bounds.Height -gt $_.Bounds.Width } | Select-Object -First 1
if (-not $retrato) { $retrato = [System.Windows.Forms.Screen]::PrimaryScreen }
$b = $retrato.Bounds

# --app abre sem barra de endereço (janela limpa); a posição já nasce no monitor certo.
Start-Process $edge -ArgumentList @(
  "--user-data-dir=`"$perfil`"", "--remote-debugging-port=9333", "--no-first-run",
  # Esconde a barra de rolagem: no celular ela não ocupa espaço; aqui ela roubava 15 px da largura da tela.
  "--hide-scrollbars",
  "--window-position=$($b.X),$($b.Y)", "--window-size=$($b.Width),$($b.Height)", "--app=$pagina")

# Espera a janela aparecer e maximiza no monitor em pé (funções do próprio Windows, via user32.dll).
Add-Type @'
using System; using System.Runtime.InteropServices;
public class JanelaPrevia {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool p);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
'@
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  $janela = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "Prévia*" } | Select-Object -First 1
  if ($janela) {
    $h = $janela.MainWindowHandle
    [JanelaPrevia]::ShowWindow($h, 9) | Out-Null                                   # 9 = restaurar
    [JanelaPrevia]::MoveWindow($h, $b.X + 50, $b.Y + 50, 800, 800, $true) | Out-Null # leva para o monitor
    [JanelaPrevia]::ShowWindow($h, 3) | Out-Null                                   # 3 = maximizar
    [JanelaPrevia]::SetForegroundWindow($h) | Out-Null
    "Prévia aberta no monitor $($retrato.DeviceName) ($($b.Width)x$($b.Height))."
    exit 0
  }
}
"Não achei a janela da prévia."
exit 1
