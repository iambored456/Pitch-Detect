/***************************************************
 * toggles.js
 *    - Removed references to flats/sharps toggles
 *    - Uses string-based tonic names (17 possible)
 *    - Keeps "degrees" and "Show Accidentals" logic
 ***************************************************/

// Set the current tonic (e.g. "C", "G♭", "B♭", etc.)
function setTonic(newTonicName) {
  currentTonicName = newTonicName;

  // Re-draw the plot if available
  if (typeof reDrawPlot === "function") {
    reDrawPlot();
  }

  // If the drone is active, update its frequency to match new tonic
  if (droneActive && droneOsc) {
    let freq = parseTonicToFrequency(currentTonicName, droneOctave);
    droneOsc.frequency.value = freq;
  }
}

// Toggle whether to display scale degrees (1..7)
function setLabelMode(useDegrees) {
  useScaleDegrees = useDegrees;
  if (typeof reDrawPlot === "function") {
    reDrawPlot();
  }
}

// Toggle whether to show "accidental" pitches 
// (the 5 pitch classes not in the major scale)
function setAccidentalsVisibility(checked) {
  showAccidentals = checked;
  if (typeof reDrawPlot === "function") {
    reDrawPlot();
  }
}

/**
 * parseTonicToFrequency(tonicName, octave)
 * - Example usage: parseTonicToFrequency("C", 3) => 130.81 Hz
 *   (Middle C is ~261.63 at octave 4, so octave 3 is ~130.81)
 * 
 * For a more robust approach, you might want to map each
 * tonicName + octave -> a specific MIDI note, then pass to
 * frequencyFromNoteNumber(midi).
 */
function parseTonicToFrequency(tonicName, octave) {
  // Basic references for "C" in various octaves:
  //   MIDI 60 => C4 => ~261.63 Hz
  //   MIDI 48 => C3 => ~130.81 Hz
  //   MIDI 72 => C5 => ~523.25 Hz
  // So, C3 is MIDI 48. If we assume "C" is the reference,
  // find how many semitones above or below "C" that tonic is,
  // then add 12 * (octave - 3).
  // 
  // We'll use a small map from tonicName -> semitone offset from C:
  const tonicToSemisFromC = {
    "C":   0,
    "C♯":  1, "D♭": 1,
    "D":   2,
    "D♯":  3, "E♭": 3,
    "E":   4,
    "F":   5,
    "F♯":  6, "G♭": 6,
    "G":   7,
    "G♯":  8, "A♭": 8,
    "A":   9,
    "A♯":  10, "B♭": 10,
    "B":   11
  };

  let semis = tonicToSemisFromC[tonicName] || 0;
  // "C3" => MIDI 48
  let baseMidiC3 = 48;

  let midi = baseMidiC3 + semis + 12 * (octave - 3);

  // Now convert MIDI -> frequency
  return 440 * Math.pow(2, (midi - 69) / 12);
}
