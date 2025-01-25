/********************************************************
 * plotMain.js
 *   - Removed debug/log references
 *   - No more flat/sharp toggles
 *   - Core logic remains for real-time plotting
 ********************************************************/

function updatePlot(frequency) {
  if (!plotCtx || !noteCtx) return;

  let currentTime = Date.now();

  // Clamp freq to [minFreq..plotMaxFreq] for display
  if (frequency < minFreq) frequency = minFreq;
  if (frequency > plotMaxFreq) frequency = plotMaxFreq;

  // Push the new data point
  plotData.push({ y: frequency, time: currentTime });
  // Remove old data outside the time window
  while (plotData.length > 0 && (currentTime - plotData[0].time) > timeWindow) {
    plotData.shift();
  }

  // Also push to 'frequencies' if freq > 0
  if (frequency > 0) {
    frequencies.push({ frequency, time: currentTime, clarity: 1 });
  }
  while (frequencies.length > 0 && (currentTime - frequencies[0].time) > timeWindow) {
    frequencies.shift();
  }

  // Re-draw the entire plot
  reDrawPlot();
}

/**
 * Re-draw the entire plot: Y-axis + note dots
 */
function reDrawPlot() {
  // Clear the main plot area
  plotCtx.clearRect(plotStartX, 0, plotWidth, plotHeight);

  // Re-draw Y-axis lines/labels
  drawYAxis(notesInRange, logMin, logMax, plotHeight);

  // Then draw the note trace
  drawNotes();
}

/**
 * drawNotes()
 *  - Draws circles for each note in 'frequencies'
 *  - Connects “close” points with lines
 */
function drawNotes() {
  if (!noteCtx) return;

  let w = noteCanvas.width;
  let h = noteCanvas.height;
  let currentTime = Date.now();

  noteCtx.clearRect(0, 0, w, h);

  // Convert 'frequencies' to array of x,y points
  let notePoints = frequencies.map(freqData => {
    let { frequency, time, clarity } = freqData;
    let midi = noteFromPitch(frequency);  
    let centsOff = centsOffFromPitch(frequency, midi);
    let pc = midi % 12;

    // x: how far back in time
    let x = plotStartX + plotWidth - (currentTime - time) / timeWindow * plotWidth;

    // y: map MIDI note + cents offset => vertical
    let y = scaleY(midi + centsOff / 100);

    // color: fade between color of pcBase & pcNext
    let color = colorFromNoteCustom(midi + centsOff / 100);

    return { x, y, time, clarity, color, pc };
  });

  // Draw connecting lines
  noteCtx.strokeStyle = 'rgba(0,0,0,0.6)';
  noteCtx.lineWidth = 2;
  noteCtx.beginPath();

  for (let i = 0; i < notePoints.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < notePoints.length && connections < maxConnections; j++) {
      let dx = notePoints[i].x - notePoints[j].x;
      let dy = notePoints[i].y - notePoints[j].y;
      let dist = Math.sqrt(dx * dx + dy * dy);
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
    if (!showAccidentals && !isInMajorScale(pt.pc)) {
      return; // Skip if hiding accidentals
    }

    let opacity = Math.min(pt.clarity * 0.5, 1);
    noteCtx.fillStyle = `rgba(${pt.color[0]}, ${pt.color[1]}, ${pt.color[2]}, ${opacity})`;
    noteCtx.beginPath();
    noteCtx.arc(pt.x, pt.y, 9, 0, 2 * Math.PI);
    noteCtx.fill();
  });
}
