$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskImages = [Collections.Generic.List[byte[]]]::new()
$taskSizes = @(16,32,48,256)
foreach ($taskSize in $taskSizes) {
  $taskBitmap = [Drawing.Bitmap]::new($taskSize,$taskSize,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $taskGraphics = [Drawing.Graphics]::FromImage($taskBitmap)
  $taskGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $taskGraphics.ScaleTransform($taskSize/256.0,$taskSize/256.0)
  $taskGraphics.Clear([Drawing.Color]::Transparent)
  $taskNight = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,24,47,54))
  $taskCream = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,246,231,194))
  $taskInk = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,34,60,62))
  $taskGold = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,214,180,115))
  $taskPink = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,221,161,147))
  $taskGraphics.FillEllipse($taskNight,8,8,240,240)
  $taskGraphics.FillEllipse($taskGold,126,31,73,73)
  $taskGraphics.FillEllipse($taskNight,148,20,69,70)
  $taskEars = [Drawing.PointF[]]@([Drawing.PointF]::new(61,143),[Drawing.PointF]::new(51,78),[Drawing.PointF]::new(98,108),[Drawing.PointF]::new(151,108),[Drawing.PointF]::new(193,78),[Drawing.PointF]::new(185,143))
  $taskGraphics.FillPolygon($taskCream,$taskEars)
  $taskGraphics.FillEllipse($taskCream,49,105,150,112)
  $taskGraphics.FillPolygon($taskPink,[Drawing.PointF[]]@([Drawing.PointF]::new(66,94),[Drawing.PointF]::new(70,124),[Drawing.PointF]::new(90,112)))
  $taskGraphics.FillPolygon($taskPink,[Drawing.PointF[]]@([Drawing.PointF]::new(181,94),[Drawing.PointF]::new(177,124),[Drawing.PointF]::new(158,112)))
  $taskPen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(255,34,60,62),6)
  $taskPen.StartCap=[Drawing.Drawing2D.LineCap]::Round; $taskPen.EndCap=[Drawing.Drawing2D.LineCap]::Round
  $taskGraphics.DrawArc($taskPen,82,146,20,15,190,160)
  $taskGraphics.DrawArc($taskPen,145,146,20,15,190,160)
  $taskGraphics.FillEllipse($taskPink,117,166,14,10)
  $taskGraphics.DrawArc($taskPen,112,171,13,10,0,120)
  $taskGraphics.DrawArc($taskPen,124,171,13,10,60,120)
  $taskGraphics.FillEllipse($taskGold,94,202,67,16)
  $taskGraphics.FillPolygon($taskGold,[Drawing.PointF[]]@([Drawing.PointF]::new(147,210),[Drawing.PointF]::new(148,230),[Drawing.PointF]::new(170,232),[Drawing.PointF]::new(162,209)))
  $taskGraphics.FillEllipse($taskGold,47,39,10,10)
  $taskGraphics.FillEllipse($taskGold,219,142,9,9)
  $taskMemory = [IO.MemoryStream]::new()
  $taskBitmap.Save($taskMemory,[Drawing.Imaging.ImageFormat]::Png)
  $taskImages.Add($taskMemory.ToArray())
  $taskMemory.Dispose(); $taskGraphics.Dispose(); $taskBitmap.Dispose()
  $taskNight.Dispose(); $taskCream.Dispose(); $taskInk.Dispose(); $taskGold.Dispose(); $taskPink.Dispose(); $taskPen.Dispose()
}
$taskIcon = [IO.FileStream]::new((Join-Path $PSScriptRoot 'mooncat.ico'),[IO.FileMode]::Create)
$taskWriter = [IO.BinaryWriter]::new($taskIcon)
$taskWriter.Write([uint16]0); $taskWriter.Write([uint16]1); $taskWriter.Write([uint16]$taskImages.Count)
$taskOffset = 6 + 16*$taskImages.Count
for ($taskIndex=0;$taskIndex -lt $taskImages.Count;$taskIndex++) {
  $taskDimension = if ($taskSizes[$taskIndex] -eq 256) { 0 } else { $taskSizes[$taskIndex] }
  $taskWriter.Write([byte]$taskDimension); $taskWriter.Write([byte]$taskDimension)
  $taskWriter.Write([byte]0); $taskWriter.Write([byte]0)
  $taskWriter.Write([uint16]1); $taskWriter.Write([uint16]32)
  $taskWriter.Write([uint32]$taskImages[$taskIndex].Length); $taskWriter.Write([uint32]$taskOffset)
  $taskOffset += $taskImages[$taskIndex].Length
}
foreach ($taskBytes in $taskImages) { $taskWriter.Write($taskBytes) }
$taskWriter.Dispose(); $taskIcon.Dispose()
