param(
  [Parameter(Mandatory = $true)]
  [string]$TextBase64,

  [Parameter(Mandatory = $true)]
  [string]$OutFile
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$textBytes = [Convert]::FromBase64String($TextBase64)
$text = [Text.Encoding]::UTF8.GetString($textBytes)
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() |
  Where-Object { $_.VoiceInfo.Culture.Name -eq "en-US" -and $_.VoiceInfo.Gender -eq "Female" } |
  Select-Object -First 1

if ($voice) {
  $synth.SelectVoice($voice.VoiceInfo.Name)
}

$synth.Rate = 2
$synth.Volume = 100
$synth.SetOutputToWaveFile($OutFile)
$synth.Speak($text)
$synth.Dispose()
