// ===================== Tonic & Toggle Functions =====================

function setTonic(newOffset) {
    tonicOffset = newOffset;
    if (plotCtx) {
      drawYAxis(notesInRange, logMin, logMax, plotHeight);
    }
    if (noteCtx) {
      drawNotes();
    }
  
    // If the drone is active, update its frequency
    if (droneActive && droneOsc) {
      let freq = parseTonicToFrequency(tonicOffset, droneOctave);
      droneOsc.frequency.value = freq;
    }
  }
  
  function setLabelMode(useDegrees) {
    useScaleDegrees = useDegrees;
    if (plotCtx) drawYAxis(notesInRange, logMin, logMax, plotHeight);
    if (noteCtx) drawNotes();
  }
  
  function setShowFlats(flag) {
    showFlats = flag;
    if (plotCtx) drawYAxis(notesInRange, logMin, logMax, plotHeight);
    if (noteCtx) drawNotes();
  }
  
  function setShowSharps(flag) {
    showSharps = flag;
    if (plotCtx) drawYAxis(notesInRange, logMin, logMax, plotHeight);
    if (noteCtx) drawNotes();
  }
  