$path = 'c:\Users\USER\Tally_accounting\frontend\src\modules\sales\QuotesView.jsx'
$lines = [System.IO.File]::ReadAllLines($path)

# Keep lines 1..1309 (0-indexed: 0..1308), then skip to line 1836 onwards (0-indexed: 1835..)
$part1 = $lines[0..1308]
$part2 = $lines[1835..($lines.Length - 1)]

$result = $part1 + $part2

[System.IO.File]::WriteAllLines($path, $result)
Write-Host "Done. Total lines now: $($result.Count)"
