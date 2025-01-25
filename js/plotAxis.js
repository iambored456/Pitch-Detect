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
 *   offsetPC = (pc - tonicPC + 12) % 12
 *   0 => Tonic, 7 => “5th”, etc. 
 *
 * If you want the “tonic line” to be red, offsetPC=0 => red.
 * If you want the “dominant (5th) line” to have a grey rectangle, offsetPC=7 => ...
 * etc.
 */
function getLineStyle(offsetPC) {
  switch (offsetPC) {
    case 0:  // Tonic
      return { color: "#FF0000", dash: [], width: 2 }; // Red line
    case 7:  // 5th above tonic
      return "greyRect"; // fill a grey rectangle row
    case 5:  // 4th above tonic
      return { color: "#000000", dash: [5, 5], width: 1 };
    // Add or remove cases as you like
    default:
      // Possibly just a normal black line
      return { color: "#000000", dash: [], width: 1 };
  }
}

function getLineStyle(offsetPC) {
  // This switch returns a style object or "greyRect" or null
  // for each offsetPC (0..11).
  switch (offsetPC) {
    case 0:  // Tonic => red line
      return { color: "#FF0000", dash: [], width: 2 };
    case 1:  
      return null;
    case 2:  
      return { color: "#000000", dash: [], width: 1 };
    case 3:  
      return null;
    case 4:  
      return { color: "#000000", dash: [5,5], width: 1 };
    case 5:  
      return null;
    case 6:  
      return { color: "#000000", dash: [], width: 1 };
    case 7:  // 5th => grey rectangle row
      return "greyRect";
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
 * Clears & redraws the Y-axis with horizontal lines. 
 * Now uses getOffsetPitchClass(midi) => offsetPC for the line style.
 */
function drawYAxis(notes, logMin, logMax, plotHeight) {
  if (!plotCtx) return;

  // Clear the entire Y-axis region
  plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);

  // 1) Decide which pitch classes are in Column A vs. B
  //    (swapping if the Tonic PC is in B)
  let colA = getColumnA(); // either [0,2,4,6,8,10] or [1,3,5,7,9,11]
  let colB = getColumnB();

  // 2) Hardcode the X positions for left vs right side
  const rightColumnX1 = yAxisWidth + plotWidth + 25;
  const rightColumnX2 = yAxisWidth + plotWidth + 75;
  const leftColumnX1  = yAxisWidth - 25;
  const leftColumnX2  = yAxisWidth - 75;

  let prevY = plotHeight;

  notes.forEach(note => {
    let { midi, freq } = note;

    // offset-based line style logic (tonic= red, offset=7= greyRect, etc.)
    let offsetPC = getOffsetPitchClass(midi);
    let style = getLineStyle(offsetPC);

    // Compute Y via log scaling
    let logFreq = Math.log(freq);
    let normalized = (logFreq - logMin) / (logMax - logMin);
    let y = plotHeight - normalized * plotHeight;

    // Fill a grey rectangle if style === "greyRect"
    if (style === "greyRect") {
      let rowHeight = prevY - y;
      if (rowHeight > 0) {
        plotCtx.fillStyle = "rgba(200, 200, 200, 0.5)";
        plotCtx.fillRect(plotStartX, y - 13, plotWidth, 26);
      }
    }
    prevY = y;
    
    // If style is an object => draw line
    if (style && typeof style === "object") {
      plotCtx.strokeStyle = style.color;
      plotCtx.lineWidth = style.width;
      plotCtx.setLineDash(style.dash || []);
      plotCtx.beginPath();
      plotCtx.moveTo(0, y);
      plotCtx.lineTo(plotCanvas.width, y);
      plotCtx.stroke();
      // reset
      plotCtx.setLineDash([]);
      plotCtx.strokeStyle = "#000";
      plotCtx.lineWidth = 1;
    }

    // Decide which label to draw for this note
    let displayedLabel = getNoteLabel(midi);
    if (!displayedLabel) {
      // e.g. out-of-scale note & showAccidentals==false => skip
      return;
    }

    // If you want Tonic’s offset=0 => index 0 color, 
    // do offset-based background color:
    // let bgColor = labelBackgroundColors[offsetPC] || "#fff";

    // Or if you want the absolute pitch class color:
    let pc = midi % 12;
    let bgColor = isInMajorScale(pc) ? labelBackgroundColors[offsetPC] : null;

    // In-scale => bigger font, out-of-scale => smaller
    let fontSize = isInMajorScale(pc) ? 18 : 14;
    plotCtx.font = `${fontSize}px Arial`;
    plotCtx.textBaseline = "middle";

    // 3) Check if this absolute pc is in colA or colB
    let belongsToA = colA.includes(pc); 
    let leftX  = belongsToA ? leftColumnX1 : leftColumnX2;
    let rightX = belongsToA ? rightColumnX1 : rightColumnX2;

    if (bgColor) {
      // Left background
      plotCtx.fillStyle = bgColor;
      plotCtx.fillRect(leftX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
    }

    // Left text
    plotCtx.fillStyle = "#000";
    plotCtx.textAlign = "center";
    plotCtx.fillText(displayedLabel, leftX, y);

    if (bgColor) {
      // Right background
      plotCtx.fillStyle = bgColor;
      plotCtx.fillRect(rightX - 25, y - (fontSize * 0.72), 50, fontSize * 1.44);
    }

    // Right text
    plotCtx.fillStyle = "#000";
    plotCtx.fillText(displayedLabel, rightX, y);
  });

  // Draw bounding lines for the plot area
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


/**
 * scaleY(midiValue)
 *  Maps midiValue -> [0..plotHeight] by the notesInRange array
 */
function scaleY(midiValue) {
  if (!notesInRange.length) return plotHeight / 2;
  let minMidi = notesInRange[0].midi;
  let maxMidi = notesInRange[notesInRange.length - 1].midi;
  let normalized = (midiValue - minMidi) / (maxMidi - minMidi);
  return plotHeight - normalized * plotHeight;
}

/**
 * For color interpolation between pitch classes,
 * we can still use the absolute pc (midiFloor % 12)
 * or do something offset-based. Shown here is absolute pc:
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
  return interpolateRgb(baseColor, nextColor, fraction); // [r,g,b]
}
