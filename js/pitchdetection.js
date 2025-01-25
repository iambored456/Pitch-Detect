// ===================== Pitch Detection & Main Loop =====================

let isDetecting = false;

function debugLog(message) {
  const panel = document.getElementById("debugPanel");
  if (!panel) return; // Safety check
  panel.textContent += message + "\n";
}


window.onload = function() {
    debugLog("window.onload: Creating AudioContext");
    audioContext = new AudioContext();
    MAX_SIZE = Math.max(4, Math.floor(audioContext.sampleRate / 5000));
    debugLog("window.onload: AudioContext sample rate = " + audioContext.sampleRate);
    detectorElem = document.getElementById("detector");
    canvasElem   = document.getElementById("output");
    pitchElem    = document.getElementById("pitch");
    noteElem     = document.getElementById("note");
    detuneElem   = document.getElementById("detune");
    detuneAmount = document.getElementById("detune_amt");
  
    // The frequency plot
    plotCanvas = document.getElementById("frequencyPlot");
    if (plotCanvas) {
      plotCtx = plotCanvas.getContext("2d");
    }
  
    // The note visualization
    noteCanvas = document.getElementById("noteCanvas");
    if (noteCanvas) {
      noteCtx = noteCanvas.getContext("2d");
    }
  
    // Generate notes in [minFreq..plotMaxFreq]
    notesInRange = generateNotes(minFreq, plotMaxFreq);
    logMin = Math.log(minFreq);
    logMax = Math.log(plotMaxFreq);
  
    // Initial draw
    if (plotCtx) drawYAxis(notesInRange, logMin, logMax, plotHeight);
    if (noteCtx) drawNotes();
  
    // Initialize the Drone gain node
    droneGain = audioContext.createGain();
    droneGain.gain.value = 0.5; // 50% volume
    droneGain.connect(audioContext.destination);
  };
  
  function startPitchDetect() {
    let startBtn = document.getElementById("startBtn");
    
    if (!isDetecting) {
        // Start detection
        navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                highpassFilter: false
            }
        })
        .then(stream => {
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Update button state
            startBtn.textContent = "Stop";
            startBtn.classList.add("active");
            isDetecting = true;
            
            // Set up audio processing
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            mediaStreamSource.connect(analyser);
            updatePitch();
        })
        .catch(err => {
            console.error(`${err.name}: ${err.message}`);
            alert('Live input failed.');
            startBtn.textContent = "Start";
            startBtn.classList.remove("active");
            isDetecting = false;
        });
    } else {
        // Stop detection
        startBtn.textContent = "Start";
        startBtn.classList.remove("active");
        isDetecting = false;
        
        // Stop audio processing
        if (mediaStreamSource) {
            mediaStreamSource.disconnect();
            mediaStreamSource = null;
        }
        if (analyser) {
            analyser.disconnect();
            analyser = null;
        }
        
        // Cancel animation frame
        if (rafID) {
            cancelAnimationFrame(rafID);
            rafID = null;
        }
        
        // Clear plot data
        plotData = [];
        frequencies = [];
        
        // Clear note visualization
        if (noteCtx) {
            noteCtx.clearRect(0, 0, noteCanvas.width, noteCanvas.height);
        }
        
        // Reset detector display
        detectorElem.className = "vague";
        pitchElem.innerText = "--";
        noteElem.innerText = "-";
        document.getElementById("octave").innerText = "-";
        detuneAmount.innerText = "--";
    }
}
  
  function toggleLiveInput() {
    if (isPlaying) {
      sourceNode.stop(0);
      sourceNode = null;
      analyser = null;
      isPlaying = false;
      if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
      }
      window.cancelAnimationFrame(rafID);
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        highpassFilter: false
      }
    })
    .then(gotStream)
    .catch(err => {
      console.error(`${err.name}: ${err.message}`);
      alert('Live input failed.');
    });
  }
  
  function gotStream(stream) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    mediaStreamSource.connect(analyser);
    isPlaying = true;
    updatePitch();
  }
  
  // Basic pitch → MIDI note
  function noteFromPitch(frequency) {
    let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  }
  
  function centsOffFromPitch(frequency, note) {
    return Math.floor(
      1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2)
    );
  }
  
  // Autocorrelation approach
  function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;
  
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }
    buf = buf.slice(r1, r2);
    SIZE = buf.length;
  
    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] += buf[j] * buf[j + i];
      }
    }
    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  }
  
  // Main animation loop for pitch detection
  function updatePitch(time) {
    if (isDetecting) {
      analyser.getFloatTimeDomainData(buf);
      let ac = autoCorrelate(buf, audioContext.sampleRate);
  
      if (ac === -1) {
        detectorElem.className = "vague";
        pitchElem.innerText = "--";
        noteElem.innerText = "-";
        document.getElementById("octave").innerText = "-";
        detuneElem.className = "";
        detuneAmount.innerText = "--";
      } else {
        detectorElem.className = "confident";
        pitchElem.innerText = Math.round(ac);
        let note = noteFromPitch(ac);
        noteElem.innerHTML = noteStrings[note % 12];
        document.getElementById("octave").innerText = Math.floor(note/12) - 1;
  
        let detune = centsOffFromPitch(ac, note);
        if (detune === 0) {
          detuneElem.className = "";
          detuneAmount.innerHTML = "--";
        } else {
          detuneElem.className = (detune < 0) ? "flat" : "sharp";
          detuneAmount.innerHTML = Math.abs(detune);
        }
        updatePlot(ac);
      }
    }
  
    // Always animate the plot
    if (plotCtx) {
      reDrawPlot();
    }
  
    // Continue animation loop
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    }
    rafID = window.requestAnimationFrame(updatePitch);
  }
  
