// ===================== Plotting, Y-axis, and Note Visualization =====================

function generateNotes(minFreq, maxFreq) {
    let results = [];
    for (let midi = 12; midi <= 108; midi++) {
      let freq = frequencyFromNoteNumber(midi);
      if (freq >= minFreq && freq <= maxFreq) {
        results.push({ midi, freq });
      }
    }
    return results;
  }

/**
 * Draw the Y-axis lines, backgrounds, and labels.
 * - offsetPC=7 => grey rectangle
 * - Use 18px font for diatonic PCs, 14px for others
 */
function drawYAxis(notes, logMin, logMax, plotHeight) {
  if (!plotCtx) return;
  plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);

  let colA = getColumnA();
  let colB = getColumnB();

  const rightLeftColumnX = yAxisWidth + plotWidth + 25;
  const rightRightColumnX = yAxisWidth + plotWidth + 75;
  const leftLeftColumnX = yAxisWidth - 25;
  const leftRightColumnX = yAxisWidth - 75;

  let prevY = plotHeight;

  notes.forEach(note => {
    let midi = note.midi;
    let freq = note.freq;
    let offsetPC = getOffsetPitchClass(midi);

    let style = getLineStyle(offsetPC);

    let logFreq = Math.log(freq);
    let normalized = (logFreq - logMin) / (logMax - logMin);
    let y = plotHeight - normalized * plotHeight;

    // Draw grey rectangle row if offsetPC=7
    if (offsetPC === 7) {
      let rowHeight = prevY - y;
      if (rowHeight > 0) {
        plotCtx.fillStyle = "rgba(200, 200, 200, 0.5)";
        plotCtx.fillRect(plotStartX, y - 13, plotWidth, 26);
      }
    }
    prevY = y;

    // Horizontal line
    if (style && style !== "greyRect") {
      plotCtx.strokeStyle = style.color;
      plotCtx.lineWidth = style.width;
      plotCtx.setLineDash(style.dash || []);

      plotCtx.beginPath();
      plotCtx.moveTo(0, y);
      plotCtx.lineTo(plotCanvas.width, y);
      plotCtx.stroke();

      // reset
      plotCtx.setLineDash([]);
      plotCtx.strokeStyle = "#000000";
      plotCtx.lineWidth = 1;
    }

    // Label
    let displayedLabel;
    if (useScaleDegrees) {
      displayedLabel = getDegreeLabel(offsetPC);
    } else {
      displayedLabel = getAccidentalName(midi);
    }

    // White background for accidentals, colored for others
    let bgColor = isAccidentalOffsetPC(offsetPC) ? "#ffffff" : labelBackgroundColors[offsetPC];
    let fontSize = diatonicPCs.includes(offsetPC) ? 18 : 14;
    plotCtx.font = `${fontSize}px Arial`;
    plotCtx.textBaseline = "middle";

    // Decide which column
    let belongsToA = colA.includes(midi % 12);
    let leftX  = belongsToA ? leftLeftColumnX : leftRightColumnX;
    let rightX = belongsToA ? rightLeftColumnX : rightRightColumnX;

    if (bgColor && displayedLabel) {
      plotCtx.fillStyle = bgColor;
      plotCtx.fillRect(leftX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
    }
    plotCtx.fillStyle = "black";
    plotCtx.textAlign = "center";
    if (displayedLabel) {
      plotCtx.fillText(displayedLabel, leftX, y);
    }

    // Right label
    if (bgColor && displayedLabel) {
      plotCtx.fillStyle = bgColor;
      plotCtx.fillRect(rightX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
    }
    plotCtx.fillStyle = "black";
    if (displayedLabel) {
      plotCtx.fillText(displayedLabel, rightX, y);
    }
  });

  // Vertical boundary lines
  plotCtx.strokeStyle = "#000000";
  plotCtx.lineWidth = 1;
  plotCtx.setLineDash([]);

  // Left boundary
  plotCtx.beginPath();
  plotCtx.moveTo(yAxisWidth, 0);
  plotCtx.lineTo(yAxisWidth, plotHeight);
  plotCtx.stroke();

  // Right boundary
  plotCtx.beginPath();
  plotCtx.moveTo(plotWidth + yAxisWidth, 0);
  plotCtx.lineTo(plotWidth + yAxisWidth, plotHeight);
  plotCtx.stroke();
}

function updatePlot(frequency) {
  if (!plotCtx || !noteCtx) return;

  let currentTime = Date.now();
  if (frequency < minFreq) frequency = minFreq;
  if (frequency > plotMaxFreq) frequency = plotMaxFreq;

  plotData.push({ y: frequency, time: currentTime });
  while (plotData.length > 0 && (currentTime - plotData[0].time) > timeWindow) {
    plotData.shift();
  }

  if (frequency > 0) {
    frequencies.push({ frequency, time: currentTime, clarity: 1 });
  }
  while (frequencies.length > 0 && (currentTime - frequencies[0].time) > timeWindow) {
    frequencies.shift();
  }

  // Clear the main plot area, then re-draw
  plotCtx.clearRect(plotStartX, 0, plotWidth, plotHeight);
  drawYAxis(notesInRange, logMin, logMax, plotHeight);
  drawNotes();
}

function drawNotes() {
  if (!noteCtx) return;
  let w = noteCanvas.width;
  let h = noteCanvas.height;
  let currentTime = Date.now();

  noteCtx.clearRect(0, 0, w, h);

  let notePoints = frequencies.map(freqData => {
    let t = freqData.time;
    let f = freqData.frequency;
    let c = freqData.clarity;
    let midi = noteFromPitch(f);
    let centsOff = centsOffFromPitch(f, midi);

    // X/Y coordinates on the canvas
    let x = plotStartX + plotWidth - (currentTime - t) / timeWindow * plotWidth;
    let y = scaleY(midi + centsOff / 100);

    // CHANGED: pass the fractional MIDI value
    let color = colorFromNoteCustom(midi + centsOff / 100);

    return { x, y, time: t, clarity: c, color };
  });

  // Connect nearby points
  noteCtx.strokeStyle = 'rgba(0,0,0,0.6)';
  noteCtx.lineWidth = 2;
  noteCtx.beginPath();
  for (let i = 0; i < notePoints.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < notePoints.length && connections < maxConnections; j++) {
      let dx = notePoints[i].x - notePoints[j].x;
      let dy = notePoints[i].y - notePoints[j].y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= proximityThreshold) {
        noteCtx.moveTo(notePoints[i].x, notePoints[i].y);
        noteCtx.lineTo(notePoints[j].x, notePoints[j].y);
        connections++;
      }
    }
  }
  noteCtx.stroke();

  // Draw circles
  notePoints.forEach(pt => {
    let opacity = Math.min(pt.clarity * 0.5, 1);
    noteCtx.fillStyle = `rgba(${pt.color[0]}, ${pt.color[1]}, ${pt.color[2]}, ${opacity})`;
    noteCtx.beginPath();
    noteCtx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
    noteCtx.fill();
  });
}

function scaleY(midiValue) {
  if (!notesInRange.length) return plotHeight / 2;
  let minNote = notesInRange[0].midi;
  let maxNote = notesInRange[notesInRange.length - 1].midi;
  let normalized = (midiValue - minNote) / (maxNote - minNote);
  return plotHeight - normalized * plotHeight;
}

// ===================== Color interpolation for dynamic coloring =====================

function hexToRgb(hex) {
  let bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function interpolateRgb(c1, c2, factor) {
  return c1.map((v, i) => Math.round(v + factor * (c2[i] - v)));
}

// using offset pitch class & labelBackgroundColors
function colorFromNoteCustom(pitch) {
  // 1) Integer MIDI note & fraction
  let midiFloor = Math.floor(pitch);
  let fraction = pitch - midiFloor;

  // 2) Offset pitch class
  let offsetPCBase = getOffsetPitchClass(midiFloor);
  let offsetPCNext = (offsetPCBase + 1) % 12;

  // 3) Convert hex => [r,g,b]
  let baseColor = hexToRgb(labelBackgroundColors[offsetPCBase]);
  let nextColor = hexToRgb(labelBackgroundColors[offsetPCNext]);

  // 4) Return interpolated color
  return interpolateRgb(baseColor, nextColor, fraction);
}
// ===================== Plotting, Y-axis, and Note Visualization =====================

function generateNotes(minFreq, maxFreq) {
  let results = [];
  for (let midi = 12; midi <= 108; midi++) {
    let freq = frequencyFromNoteNumber(midi);
    if (freq >= minFreq && freq <= maxFreq) {
      results.push({ midi, freq });
    }
  }
  return results;
}

/**
* Draw the Y-axis lines, backgrounds, and labels.
* - offsetPC=7 => grey rectangle
* - Use 18px font for diatonic PCs, 14px for others
*/
function drawYAxis(notes, logMin, logMax, plotHeight) {
if (!plotCtx) return;
plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);

let colA = getColumnA();
let colB = getColumnB();

const rightLeftColumnX = yAxisWidth + plotWidth + 25;
const rightRightColumnX = yAxisWidth + plotWidth + 75;
const leftLeftColumnX = yAxisWidth - 25;
const leftRightColumnX = yAxisWidth - 75;

let prevY = plotHeight;

notes.forEach(note => {
  let midi = note.midi;
  let freq = note.freq;
  let offsetPC = getOffsetPitchClass(midi);

  let style = getLineStyle(offsetPC);

  let logFreq = Math.log(freq);
  let normalized = (logFreq - logMin) / (logMax - logMin);
  let y = plotHeight - normalized * plotHeight;

  // Draw grey rectangle row if offsetPC=7
  if (offsetPC === 7) {
    let rowHeight = prevY - y;
    if (rowHeight > 0) {
      plotCtx.fillStyle = "rgba(200, 200, 200, 0.5)";
      plotCtx.fillRect(plotStartX, y - 13, plotWidth, 26);
    }
  }
  prevY = y;

  // Horizontal line
  if (style && style !== "greyRect") {
    plotCtx.strokeStyle = style.color;
    plotCtx.lineWidth = style.width;
    plotCtx.setLineDash(style.dash || []);

    plotCtx.beginPath();
    plotCtx.moveTo(0, y);
    plotCtx.lineTo(plotCanvas.width, y);
    plotCtx.stroke();

    // reset
    plotCtx.setLineDash([]);
    plotCtx.strokeStyle = "#000000";
    plotCtx.lineWidth = 1;
  }

  // Label
  let displayedLabel;
  if (useScaleDegrees) {
    displayedLabel = getDegreeLabel(offsetPC);
  } else {
    displayedLabel = getAccidentalName(midi);
  }

  // White background for accidentals, colored for others
  let bgColor = isAccidentalOffsetPC(offsetPC) ? "#ffffff" : labelBackgroundColors[offsetPC];
  let fontSize = diatonicPCs.includes(offsetPC) ? 18 : 14;
  plotCtx.font = `${fontSize}px Arial`;
  plotCtx.textBaseline = "middle";

  // Decide which column
  let belongsToA = colA.includes(midi % 12);
  let leftX  = belongsToA ? leftLeftColumnX : leftRightColumnX;
  let rightX = belongsToA ? rightLeftColumnX : rightRightColumnX;

  if (bgColor && displayedLabel) {
    plotCtx.fillStyle = bgColor;
    plotCtx.fillRect(leftX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
  }
  plotCtx.fillStyle = "black";
  plotCtx.textAlign = "center";
  if (displayedLabel) {
    plotCtx.fillText(displayedLabel, leftX, y);
  }

  // Right label
  if (bgColor && displayedLabel) {
    plotCtx.fillStyle = bgColor;
    plotCtx.fillRect(rightX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
  }
  plotCtx.fillStyle = "black";
  if (displayedLabel) {
    plotCtx.fillText(displayedLabel, rightX, y);
  }
});

// Vertical boundary lines
plotCtx.strokeStyle = "#000000";
plotCtx.lineWidth = 1;
plotCtx.setLineDash([]);

// Left boundary
plotCtx.beginPath();
plotCtx.moveTo(yAxisWidth, 0);
plotCtx.lineTo(yAxisWidth, plotHeight);
plotCtx.stroke();

// Right boundary
plotCtx.beginPath();
plotCtx.moveTo(plotWidth + yAxisWidth, 0);
plotCtx.lineTo(plotWidth + yAxisWidth, plotHeight);
plotCtx.stroke();
}

function updatePlot(frequency) {
if (!plotCtx || !noteCtx) return;

let currentTime = Date.now();
if (frequency < minFreq) frequency = minFreq;
if (frequency > plotMaxFreq) frequency = plotMaxFreq;

plotData.push({ y: frequency, time: currentTime });
while (plotData.length > 0 && (currentTime - plotData[0].time) > timeWindow) {
  plotData.shift();
}

if (frequency > 0) {
  frequencies.push({ frequency, time: currentTime, clarity: 1 });
}
while (frequencies.length > 0 && (currentTime - frequencies[0].time) > timeWindow) {
  frequencies.shift();
}

// Clear the main plot area, then re-draw
plotCtx.clearRect(plotStartX, 0, plotWidth, plotHeight);
drawYAxis(notesInRange, logMin, logMax, plotHeight);
drawNotes();
}

function drawNotes() {
if (!noteCtx) return;
let w = noteCanvas.width;
let h = noteCanvas.height;
let currentTime = Date.now();

noteCtx.clearRect(0, 0, w, h);

let notePoints = frequencies.map(freqData => {
  let t = freqData.time;
  let f = freqData.frequency;
  let c = freqData.clarity;
  let midi = noteFromPitch(f);
  let centsOff = centsOffFromPitch(f, midi);

  // X/Y coordinates on the canvas
  let x = plotStartX + plotWidth - (currentTime - t) / timeWindow * plotWidth;
  let y = scaleY(midi + centsOff / 100);

  // CHANGED: pass the fractional MIDI value
  let color = colorFromNoteCustom(midi + centsOff / 100);

  return { x, y, time: t, clarity: c, color };
});

// Connect nearby points
noteCtx.strokeStyle = 'rgba(0,0,0,0.6)';
noteCtx.lineWidth = 2;
noteCtx.beginPath();
for (let i = 0; i < notePoints.length; i++) {
  let connections = 0;
  for (let j = i + 1; j < notePoints.length && connections < maxConnections; j++) {
    let dx = notePoints[i].x - notePoints[j].x;
    let dy = notePoints[i].y - notePoints[j].y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= proximityThreshold) {
      noteCtx.moveTo(notePoints[i].x, notePoints[i].y);
      noteCtx.lineTo(notePoints[j].x, notePoints[j].y);
      connections++;
    }
  }
}
noteCtx.stroke();

// Draw circles
notePoints.forEach(pt => {
  let opacity = Math.min(pt.clarity * 0.5, 1);
  noteCtx.fillStyle = `rgba(${pt.color[0]}, ${pt.color[1]}, ${pt.color[2]}, ${opacity})`;
  noteCtx.beginPath();
  noteCtx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
  noteCtx.fill();
});
}

function scaleY(midiValue) {
if (!notesInRange.length) return plotHeight / 2;
let minNote = notesInRange[0].midi;
let maxNote = notesInRange[notesInRange.length - 1].midi;
let normalized = (midiValue - minNote) / (maxNote - minNote);
return plotHeight - normalized * plotHeight;
}

// ===================== Color interpolation for dynamic coloring =====================

function hexToRgb(hex) {
let bigint = parseInt(hex.slice(1), 16);
return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function interpolateRgb(c1, c2, factor) {
return c1.map((v, i) => Math.round(v + factor * (c2[i] - v)));
}

// CHANGED: Now using offset pitch class & labelBackgroundColors
function colorFromNoteCustom(pitch) {
// 1) Integer MIDI note & fraction
let midiFloor = Math.floor(pitch);
let fraction = pitch - midiFloor;

// 2) Offset pitch class
let offsetPCBase = getOffsetPitchClass(midiFloor);
let offsetPCNext = (offsetPCBase + 1) % 12;

// 3) Convert hex => [r,g,b]
let baseColor = hexToRgb(labelBackgroundColors[offsetPCBase]);
let nextColor = hexToRgb(labelBackgroundColors[offsetPCNext]);

// 4) Return interpolated color
return interpolateRgb(baseColor, nextColor, fraction);
}
