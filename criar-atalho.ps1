# Cria um atalho "Prévia" na Área de Trabalho, com o ícone da prévia.
# Dois cliques no atalho abrem a prévia (ou trazem para frente, se já estiver aberta).
# Uso (uma vez só): powershell -ExecutionPolicy Bypass -File criar-atalho.ps1

$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$icone = Join-Path $pasta "icone.ico"

# ---------- 1. Gera o icone.ico (se ainda não existir) ----------
# O Windows usa .ico nos atalhos. Desenhamos o mesmo ícone do icone.svg com System.Drawing (a biblioteca de
# desenho do Windows) em 256x256 e guardamos como PNG dentro de um arquivo .ico.
if (-not (Test-Path $icone)) {
  Add-Type -AssemblyName System.Drawing
  $s = 256 / 64   # o desenho original tem 64x64; tudo é multiplicado por 4
  $bmp = New-Object System.Drawing.Bitmap 256, 256
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"

  # Retângulo de cantos arredondados (GraphicsPath = um "caminho" desenhado com arcos e linhas).
  function Arredondado($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddArc($x, $y, 2 * $r, 2 * $r, 180, 90); $p.AddArc($x + $w - 2 * $r, $y, 2 * $r, 2 * $r, 270, 90)
    $p.AddArc($x + $w - 2 * $r, $y + $h - 2 * $r, 2 * $r, 2 * $r, 0, 90); $p.AddArc($x, $y + $h - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $p.CloseFigure(); return $p
  }
  $fundo = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 256, 256),
    ([System.Drawing.Color]::FromArgb(255, 255, 165, 58)), ([System.Drawing.Color]::FromArgb(255, 240, 106, 10))
  $g.FillPath($fundo, (Arredondado 0 0 256 256 (15 * $s)))
  $caneta = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (3.6 * $s)
  $caneta.StartCap = "Round"; $caneta.EndCap = "Round"
  $g.DrawPath($caneta, (Arredondado (11 * $s) (15 * $s) (33 * $s) (23 * $s) (3 * $s)))   # monitor
  $g.DrawLine($caneta, 21 * $s, 47 * $s, 35 * $s, 47 * $s)                                 # pé
  $g.DrawLine($caneta, 28 * $s, 38 * $s, 28 * $s, 47 * $s)
  $celular = Arredondado (38 * $s) (24 * $s) (16 * $s) (27 * $s) (4 * $s)                  # celular
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 24, 32, 48))), $celular)
  $g.DrawPath($caneta, $celular)
  $g.FillEllipse([System.Drawing.Brushes]::White, 44.3 * $s, 44.3 * $s, 3.4 * $s, 3.4 * $s)
  $g.Dispose()

  # Monta o .ico: um cabeçalho pequeno + a imagem PNG (o Windows aceita PNG dentro do .ico).
  $png = New-Object System.IO.MemoryStream
  $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  $bytes = $png.ToArray()
  $ico = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter $ico
  $w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)                 # cabeçalho: tipo ícone, 1 imagem
  $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0)     # 256x256 (0 = 256), sem paleta
  $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$bytes.Length); $w.Write([UInt32]22)
  $w.Write($bytes); $w.Flush()
  [System.IO.File]::WriteAllBytes($icone, $ico.ToArray())
}

# ---------- 2. Cria o atalho ----------
# WScript.Shell é o jeito clássico do Windows criar atalhos (.lnk).
$area = [Environment]::GetFolderPath("Desktop")
$atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $area "Prévia.lnk"))
$atalho.TargetPath = "powershell.exe"
$atalho.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $pasta 'abrir-previa.ps1')`""
$atalho.WorkingDirectory = $pasta
$atalho.IconLocation = $icone
$atalho.Description = "Prévia celular + computador"
$atalho.Save()
"Atalho criado em: $(Join-Path $area 'Prévia.lnk')"

# ---------- 3. Atalho do App de Treino ----------
# Liga o servidor do app (Expo) se precisar e abre o app na prévia, só no celular (veja abrir-app-expo.ps1).
$app = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $area "App de Treino (prévia).lnk"))
$app.TargetPath = "powershell.exe"
$app.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $pasta 'abrir-app-expo.ps1')`""
$app.WorkingDirectory = $pasta
$app.IconLocation = $icone
$app.Description = "Abre o App de Treino (React Native) na prévia"
$app.Save()
"Atalho criado em: $(Join-Path $area 'App de Treino (prévia).lnk')"
