param(
  [string]$DataFile = "js/data.js",
  [string]$ImageDir = "assets/images"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataPath = Join-Path $RepoRoot $DataFile
$OutputDir = Join-Path $RepoRoot $ImageDir

if (-not (Test-Path -LiteralPath $DataPath)) {
  throw "Data file not found: $DataPath"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Slugify([string]$Value) {
  $slug = ($Value.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  if ($slug.Length -gt 56) {
    return $slug.Substring(0, 56).Trim("-")
  }
  return $slug
}

function Get-Extension([string]$MimeSubtype) {
  $type = $MimeSubtype.ToLowerInvariant()
  if ($type -eq "jpeg" -or $type -eq "jpg") { return "jpg" }
  if ($type -eq "svg+xml") { return "svg" }
  $clean = $type -replace "[^a-z0-9]", ""
  if ($clean) { return $clean }
  return "webp"
}

function Find-ObjectStart([string]$Content, [int]$ImageIndex) {
  $depth = 0
  for ($i = $ImageIndex; $i -ge 0; $i--) {
    $char = $Content[$i]
    if ($char -eq "}") { $depth++ }
    if ($char -eq "{") {
      if ($depth -eq 0) { return $i }
      $depth--
    }
  }
  $lineStart = $Content.LastIndexOf("`n", $ImageIndex)
  if ($lineStart -lt 0) { return 0 }
  return $lineStart
}

function Get-Field([string]$ObjectText, [string]$Field) {
  $match = [regex]::Match($ObjectText, "$Field\s*:\s*`"([^`"]*)`"", "IgnoreCase")
  if ($match.Success) { return $match.Groups[1].Value }
  return ""
}

$Encoding = [System.Text.UTF8Encoding]::new($false)
$Content = [System.IO.File]::ReadAllText($DataPath, $Encoding)
$Pattern = [regex]'image:\s*"data:image/([a-zA-Z0-9.+-]+);base64,([^"]+)"'
$Used = [System.Collections.Generic.HashSet[string]]::new()
$Extracted = 0

$Migrated = $Pattern.Replace($Content, {
  param($Match)

  $objectStart = Find-ObjectStart $Content $Match.Index
  $objectText = $Content.Substring($objectStart, $Match.Index - $objectStart)

  $id = Slugify (Get-Field $objectText "id")
  $nameEn = Slugify (Get-Field $objectText "nameEn")
  $name = Slugify (Get-Field $objectText "name")
  $base = @($id, $nameEn, $name, "menu-image-$($Extracted + 1)") | Where-Object { $_ } | Select-Object -First 1
  $ext = Get-Extension $Match.Groups[1].Value
  $filenameBase = "migrated-$base"
  $filename = "$filenameBase.$ext"
  $counter = 2

  while ($Used.Contains($filename) -or (Test-Path -LiteralPath (Join-Path $OutputDir $filename))) {
    $filename = "$filenameBase-$counter.$ext"
    $counter++
  }

  [void]$Used.Add($filename)
  [System.IO.File]::WriteAllBytes((Join-Path $OutputDir $filename), [Convert]::FromBase64String($Match.Groups[2].Value))
  $script:Extracted++

  return "image: `"assets/images/$filename`""
})

if ($Extracted -gt 0) {
  [System.IO.File]::WriteAllText($DataPath, $Migrated, $Encoding)
}

Write-Host "Extracted $Extracted image(s)."
Write-Host "Updated $DataFile"
Write-Host "Images written to $ImageDir"
