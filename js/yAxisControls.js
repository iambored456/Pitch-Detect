/***************************************************
 * yAxisControls.js
 * 
 * Implements dynamic adjustment of the frequency plot Y-axis
 * by modifying the plot's minimum and maximum MIDI note boundaries.
 * 
 * The Y-axis range is controlled by two pairs of buttons:
 * - Top Controls adjust the upper boundary:
 *    "Expand" increases the maximum MIDI note.
 *    "Contract" decreases the maximum MIDI note.
 * - Bottom Controls adjust the lower boundary:
 *    "Expand" (down arrow) lowers the lower boundary (decreases MIDI).
 *    "Contract" (up arrow) raises the lower boundary (increases MIDI).
 *
 * Allowed boundaries are limited to:
 *   C1 (MIDI 24) as the lower limit and C6 (MIDI 84) as the upper limit.
 *
 * Initial boundaries are set to:
 *   plotMinMidi = 45  (approximately 87 Hz)
 *   plotMaxMidi = 77  (approximately 700 Hz)
 *
 * These boundaries update the global variables minFreq, plotMaxFreq,
 * logMin, logMax, and regenerate the notesInRange array used for drawing.
 ***************************************************/

var plotMinMidi = 45;
var plotMaxMidi = 77;

function updatePlotRange() {
  // Update the global frequency bounds based on the current MIDI boundaries.
  minFreq = frequencyFromNoteNumber(plotMinMidi);
  plotMaxFreq = frequencyFromNoteNumber(plotMaxMidi);
  logMin = Math.log(minFreq);
  logMax = Math.log(plotMaxFreq);
  notesInRange = generateNotes(minFreq, plotMaxFreq);
  reDrawPlot();
}

// Upper Y-Axis Controls: Adjust the upper boundary (plotMaxMidi).
function adjustUpper(action) {
  if (action === "expand") {
    if (plotMaxMidi < 84) {  // Upper limit (MIDI 84 for C6)
      plotMaxMidi++;
      updatePlotRange();
    }
  } else if (action === "contract") {
    if (plotMaxMidi > plotMinMidi + 1) { // Ensure at least one note remains in range
      plotMaxMidi--;
      updatePlotRange();
    }
  }
}

// Lower Y-Axis Controls: Adjust the lower boundary (plotMinMidi).
function adjustLower(action) {
  if (action === "expand") { // Expand downward: lower the lower boundary (decrease MIDI)
    if (plotMinMidi > 24) {  // Lower limit (MIDI 24 for C1)
      plotMinMidi--;
      updatePlotRange();
    }
  } else if (action === "contract") { // Contract: raise the lower boundary (increase MIDI)
    if (plotMinMidi < plotMaxMidi - 1) {
      plotMinMidi++;
      updatePlotRange();
    }
  }
}

// Set up event listeners for the Y-axis control buttons.
document.addEventListener("DOMContentLoaded", function(){
  // Top controls for the upper boundary.
  var upperExpandBtn = document.getElementById("yAxisUpperExpandBtn");
  var upperContractBtn = document.getElementById("yAxisUpperContractBtn");
  // Bottom controls for the lower boundary.
  var lowerContractBtn = document.getElementById("yAxisLowerContractBtn");
  var lowerExpandBtn = document.getElementById("yAxisLowerExpandBtn");

  if (upperExpandBtn) {
    upperExpandBtn.addEventListener("click", function(){
      adjustUpper("expand");
    });
  }
  if (upperContractBtn) {
    upperContractBtn.addEventListener("click", function(){
      adjustUpper("contract");
    });
  }
  if (lowerContractBtn) {
    lowerContractBtn.addEventListener("click", function(){
      adjustLower("contract");
    });
  }
  if (lowerExpandBtn) {
    lowerExpandBtn.addEventListener("click", function(){
      adjustLower("expand");
    });
  }
});
