// ===================== drone.js =====================

// If you already have this in globals.js, remove here.
// But if you do NOT, adapt to your new string-based approach.
function parseTonicToFrequency(tonicName, octave) {
  // e.g. "C3" => MIDI 48, from your code we do:
  //   let semisFromC = tonicToSemisFromC[tonicName] || 0;
  //   let baseMidiC3 = 48;
  //   let midi = baseMidiC3 + semisFromC + 12 * (octave - 3);
  //   return frequencyFromNoteNumber(midi);

  // For demonstration, let's assume you do:
  if (!window.tonicToSemisFromC || !window.frequencyFromNoteNumber) {
    console.warn("parseTonicToFrequency missing dependencies!");
    return 220; // fallback
  }
  let semisFromC = tonicToSemisFromC[tonicName] || 0; // 0..11
  let baseMidiC3 = 48; 
  let midi = baseMidiC3 + semisFromC + 12 * (octave - 3);
  return frequencyFromNoteNumber(midi);
}

// Called by your "Drone" button
function toggleDrone() {
  let droneBtn = document.getElementById("droneBtn");
  if (!droneActive) {
    // Start the Drone
    droneActive = true;
    droneBtn.classList.add("active");
    
    // Ensure audioContext is resumed
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Get the frequency for the current Tonic + Octave
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    startDrone(freq);
  } else {
    // Stop the Drone
    droneActive = false;
    droneBtn.classList.remove("active");
    stopDrone();
  }
}

function startDrone(frequency) {
  if (!audioContext) {
    // If not defined, create it
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create an oscillator
  droneOsc = audioContext.createOscillator();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = frequency;

  // Connect to the Gain node (which should be connected to destination)
  // If droneGain is not defined, define it in your onload or here:
  // e.g. droneGain = audioContext.createGain();
  // droneGain.gain.value = 0.5;
  // droneGain.connect(audioContext.destination);
  droneOsc.connect(droneGain);

  // Start producing sound
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
 * Called when user clicks an octave button: oct2Btn, oct3Btn, oct4Btn
 */
function setDroneOctave(buttonElem) {
  // Remove "active" from all
  let oct2Btn = document.getElementById("oct2Btn");
  let oct3Btn = document.getElementById("oct3Btn");
  let oct4Btn = document.getElementById("oct4Btn");
  if (oct2Btn) oct2Btn.classList.remove("active");
  if (oct3Btn) oct3Btn.classList.remove("active");
  if (oct4Btn) oct4Btn.classList.remove("active");

  // Add active to clicked
  buttonElem.classList.add("active");

  // Set droneOctave
  if (buttonElem.id === "oct2Btn") {
    droneOctave = 2;
  } else if (buttonElem.id === "oct4Btn") {
    droneOctave = 4;
  } else {
    droneOctave = 3;
  }

  // If drone is active, update freq
  if (droneActive && droneOsc) {
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    droneOsc.frequency.value = freq;
  }
}
