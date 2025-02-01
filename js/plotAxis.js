/********************************************************
 * plotAxis.js
 *    Restores tonic-relative line drawing so that 
 *    offsetPC=0 is always the Tonic line (red), etc.
 ********************************************************/

/**
 * generateNotes(minFreq, maxFreq)
 * Returns an array of { midi, freq } for each MIDI note 
 * whose frequency lies in [minFreq..maxFreq].
 */
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
 * getLineStyle(offsetPC)
 * Returns a style object for drawing a line or the string "greyRect" 
 * for offsetPC=7 (the 5th) where a grey background is desired.
 */
function getLineStyle(offsetPC) {
  switch (offsetPC) {
    case 0:
      return { color: "#FF0000", dash: [], width: 2 }; // Tonic: red solid line.
    case 1:
      return null;
    case 2:
      return { color: "#000000", dash: [], width: 1 };
    case 3:
      return null;
    case 4:
      return { color: "#000000", dash: [5, 5], width: 1 }; // Dashed line at offset 4 (E).
    case 5:
      return null;
    case 6:
      return { color: "#000000", dash: [], width: 1 };
    case 7:
      return "greyRect"; // Grey rectangle for the 5th (G).
    case 8:
      return { color: "#000000", dash: [], width: 1 };
    case 9:
      return null;
    case 10:
      return { color: "#000000", dash: [], width: 1 };
    case 11:
      return null;
    default:
      return null;
  }
}

/**
 * drawYAxis(notes, logMin, logMax, plotHeight)
 * Clears and redraws the Y-axis.
 * 
 * In this version:
 * - The vertical gap (cell height) is computed between successive note y–coordinates.
 * - Each label’s background box now spans two cells (i.e. height = 2*gap) 
 *   and is shifted upward by one cell (i.e. its top is at y - gap) so that
 *   the text (drawn at y) remains aligned with the drawn line.
 * - For grey rectangles (offsetPC=7), the rectangle now covers two cells.
 * - Left/right column x–offsets are preserved.
 */
function drawYAxis(notes, logMin, logMax, plotHeight) {
  if (!plotCtx) return;

  // Clear the entire Y-axis region.
  plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);

  // Determine which pitch classes go to left (column A) vs. right (column B).
  let colA = getColumnA();
  let colB = getColumnB();

  // Use your original x–offsets.
  const rightColumnX1 = yAxisWidth + plotWidth + 25;
  const rightColumnX2 = yAxisWidth + plotWidth + 75;
  const leftColumnX1  = yAxisWidth - 25;
  const leftColumnX2  = yAxisWidth - 75;

  // Precompute y–coordinates for each note.
  let yCoords = [];
  for (let i = 0; i < notes.length; i++) {
    let logFreq = Math.log(notes[i].freq);
    let normalized = (logFreq - logMin) / (logMax - logMin);
    let y = plotHeight - normalized * plotHeight;
    yCoords.push(y);
  }

  // Loop over each note (by index) and compute the vertical gap.
  for (let i = 0; i < notes.length; i++) {
    let note = notes[i];
    let midi = note.midi;
    // Anchor point: the note's own y–coordinate.
    let y = yCoords[i];

    // Compute the gap (cell height) for this note.
    let gap;
    if (i < notes.length - 1) {
      gap = yCoords[i] - yCoords[i+1];
    } else {
      gap = (i > 0) ? (yCoords[i-1] - y) : 20;
    }
    if (gap < 15) gap = 15; // enforce a minimum gap

    // For our new label background, we want it to cover two cells.
    // We'll fix its top at (y - gap) so that its center remains at y.
    let rectTop = y - gap;
    let rectHeight = 2 * gap;

    // Get the line style.
    let offsetPC = getOffsetPitchClass(midi);
    let style = getLineStyle(offsetPC);

    // Draw grey rectangle if required.
    if (style === "greyRect") {
      // Now, draw the grey rectangle covering two cells.
      plotCtx.fillStyle = "rgba(200, 200, 200, 0.5)";
      plotCtx.fillRect(plotStartX, y - gap, plotWidth, 2 * gap);
    } else if (style && typeof style === "object") {
      // Draw the horizontal line at the anchor y.
      plotCtx.strokeStyle = style.color;
      plotCtx.lineWidth = style.width;
      plotCtx.setLineDash(style.dash || []);
      plotCtx.beginPath();
      plotCtx.moveTo(0, y);
      plotCtx.lineTo(plotCanvas.width, y);
      plotCtx.stroke();
      plotCtx.setLineDash([]);
      plotCtx.strokeStyle = "#000";
      plotCtx.lineWidth = 1;
    }

    // Get the label text.
    let displayedLabel = getNoteLabel(midi);
    if (!displayedLabel) continue;
    let octave = Math.floor(midi / 12) - 1;
    if (!useScaleDegrees) {
      displayedLabel += octave;
    }

    // Determine the background color for the label.
    let pc = midi % 12;
    let bgColor = null;
    if (isInMajorScale(pc)) {
      bgColor = labelBackgroundColors[offsetPC] || null;
    } else if (showAccidentals && displayedLabel) {
      bgColor = "#ffffff";
    }

    // Choose the text size.
    let fontSize = isInMajorScale(pc) ? 18 : 14;
    plotCtx.font = `${fontSize}px Arial`;
    plotCtx.textBaseline = "middle";

    // Determine left/right x–positions.
    let belongsToA = colA.includes(pc);
    let leftX  = belongsToA ? leftColumnX1 : leftColumnX2;
    let rightX = belongsToA ? rightColumnX1 : rightColumnX2;

    // Draw the label background if needed.
    if (bgColor) {
      plotCtx.fillStyle = bgColor;
      // Draw the left and right background rectangles with width 50 and height = 2*gap.
      plotCtx.fillRect(leftX - 25, rectTop, 50, rectHeight);
      plotCtx.fillRect(rightX - 25, rectTop, 50, rectHeight);
    }
    // Draw the text at the anchor y so that it stays aligned with the drawn line.
    plotCtx.fillStyle = "#000";
    plotCtx.textAlign = "center";
    plotCtx.fillText(displayedLabel, leftX, y);
    plotCtx.fillText(displayedLabel, rightX, y);
  } // end for loop

  // Finally, draw the bounding lines for the plot area.
  plotCtx.strokeStyle = "#000000";
  plotCtx.lineWidth = 1;
  plotCtx.setLineDash([]);
  plotCtx.beginPath();
  plotCtx.moveTo(yAxisWidth, 0);
  plotCtx.lineTo(yAxisWidth, plotHeight);
  plotCtx.stroke();
  plotCtx.beginPath();
  plotCtx.moveTo(plotWidth + yAxisWidth, 0);
  plotCtx.lineTo(plotWidth + yAxisWidth, plotHeight);
  plotCtx.stroke();
}

/**
 * scaleY(midiValue)
 * Maps midiValue -> [0..plotHeight] by the notesInRange array.
 */
function scaleY(midiValue) {
  if (!notesInRange.length) return plotHeight / 2;
  let minMidi = notesInRange[0].midi;
  let maxMidi = notesInRange[notesInRange.length - 1].midi;
  let normalized = (midiValue - minMidi) / (maxMidi - minMidi);
  return plotHeight - normalized * plotHeight;
}

/**
 * For color interpolation between pitch classes.
 */
function hexToRgb(hex) {
  let bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function interpolateRgb(c1, c2, factor) {
  return c1.map((v, i) => Math.round(v + factor * (c2[i] - v)));
}

function colorFromNoteCustom(pitch) {
  let midiFloor = Math.floor(pitch);
  let fraction = pitch - midiFloor;
  let pcBase = midiFloor % 12;
  let pcNext = (pcBase + 1) % 12;
  let baseColor = hexToRgb(labelBackgroundColors[pcBase]);
  let nextColor = hexToRgb(labelBackgroundColors[pcNext]);
  return interpolateRgb(baseColor, nextColor, fraction);
}
