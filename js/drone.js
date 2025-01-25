// ===================== Drone Logic =====================

function parseTonicToFrequency(tonicName, octave) {
  // Use the existing tonicToSemisFromC map from globals.js
  let semisFromC = tonicToSemisFromC[tonicName] || 0;
  // C3 is MIDI 48, so calculate MIDI note number
  let baseMidiC3 = 48;
  let midi = baseMidiC3 + semisFromC + 12 * (octave - 3);
  return frequencyFromNoteNumber(midi);
}

function toggleDrone() {
  let droneBtn = document.getElementById("droneBtn");

  if (!droneActive) {
    // Start Drone using currentTonicName from globals.js
    droneActive = true;
    droneBtn.classList.add("active");
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    startDrone(freq);
  } else {
    droneActive = false;
    droneBtn.classList.remove("active");
    stopDrone();
  }
}

function startDrone(frequency) {
  droneOsc = audioContext.createOscillator();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = frequency;
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
   * Called when user clicks on an octave button (oct2, oct3, oct4).
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
  
