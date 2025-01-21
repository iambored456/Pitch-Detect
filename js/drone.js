// ===================== Drone Logic =====================

/**
 * If you already have parseTonicToFrequency(...) in globals.js 
 * or toggles.js, you can delete this local version.
 *
 * Otherwise, keep this version but adapt it to your 
 * new string-based approach.
 */
function parseTonicToFrequency(tonicName, octave) {
  // Example approach: if your globals.js has 
  //   const tonicToSemisFromC = { "C":0, "C♯":1, ...};
  //   function frequencyFromNoteNumber(midi) {...}
  // Then do:
  let semisFromC = tonicToSemisFromC[tonicName] || 0;

  // If you want "C2" => MIDI 36, "C3" => 48, etc.
  let baseMidiC2 = 36; // or 48 for "C3" as your reference
  let midi = baseMidiC2 + semisFromC + 12 * (octave - 2);
  return frequencyFromNoteNumber(midi);
}

function toggleDrone() {
  let droneBtn = document.getElementById("droneBtn");

  if (!droneActive) {
    // Start Drone
    droneActive = true;
    droneBtn.classList.add("active");

    // Use the *string-based* Tonic => e.g. "C", "G♭", etc.
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    startDrone(freq);
  } else {
    // Stop Drone
    droneActive = false;
    droneBtn.classList.remove("active");
    stopDrone();
  }
}

function startDrone(frequency) {
  if (!audioContext) {
    // Ensure audioContext is created
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  droneOsc = audioContext.createOscillator();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = frequency;
  // Connect to droneGain which is presumably connected to destination
  droneOsc.connect(droneGain);  
  droneOsc.start();
}

function stopDrone() {
  if (droneOsc) {
    droneOsc.stop();
    droneOsc.disconnect();
    droneOsc = null;
  }
}

/**
 * Called by the volume slider (0..100).
 */
function setDroneVolume(volInt) {
  let v = volInt / 100.0;
  if (droneGain) {
    droneGain.gain.value = v;
  }
}

/**
 * Called when user clicks an octave button (oct2, oct3, oct4).
 */
function setDroneOctave(buttonElem) {
  // Remove "active" from all
  document.getElementById("oct2Btn").classList.remove("active");
  document.getElementById("oct3Btn").classList.remove("active");
  document.getElementById("oct4Btn").classList.remove("active");

  // Add active to the clicked one
  buttonElem.classList.add("active");

  if (buttonElem.id === "oct2Btn") {
    droneOctave = 2;
  } else if (buttonElem.id === "oct4Btn") {
    droneOctave = 4;
  } else {
    droneOctave = 3;
  }

  // If the drone is currently on, update frequency
  if (droneActive && droneOsc) {
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    droneOsc.frequency.value = freq;
  }
}
