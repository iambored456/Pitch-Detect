// ===================== Drone Logic =====================

function parseTonicToFrequency(offset, octave) {
    // offset=0 => "C", offset=1 => "C♯", etc.
    // We map: C0 => MIDI 12, so "C2" => 36, "C3" => 48, "C4" => 60, etc.
    // Then add the offset pitch class (0..11).
    let baseForC = 12 + (12 * octave); // e.g. octave=2 => 36 => C2
    let midi = baseForC + offset;
    return frequencyFromNoteNumber(midi);
  }
  
  function toggleDrone() {
    let droneBtn = document.getElementById("droneBtn");
  
    if (!droneActive) {
      // Start Drone
      droneActive = true;
      droneBtn.classList.add("active");
      let freq = parseTonicToFrequency(tonicOffset, droneOctave);
      startDrone(freq);
    } else {
      // Stop Drone
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
      let freq = parseTonicToFrequency(tonicOffset, droneOctave);
      droneOsc.frequency.value = freq;
    }
  }
  