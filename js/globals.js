/***************************************************
 * globals.js
 *   Final Merged Version:
 *   - 17-tonic logic (currentTonicName)
 *   - offsetPC-based line omission (getLineStyle switch)
 *   - minFreq, plotMaxFreq, etc. for the plot
 ***************************************************/

// ===================== Audio & Analysis Globals =====================
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var mediaStreamSource = null;

// Drone references
var droneOsc = null;
var droneGain = null;
var droneActive = false;
var droneOctave = 3;
var defaultVolume = 0.25;

// ===================== Tonics & Toggles =====================

// The currently selected Tonic (17 possible). E.g. "C", "G♭", "B♭", etc.
var currentTonicName = "C";

// Show scale degrees instead of spelled note names?
var useScaleDegrees = false;

// Show “accidental” (non-scale) notes if true
var showAccidentals = false;

// ===================== Plot / Canvas Globals =====================

// Frequency range & canvas setup
var minFreq = 87;
var plotMaxFreq = 700;

var plotCanvas = null;
var plotCtx = null;
var noteCanvas = null;
var noteCtx = null;
var plotData = [];
var frequencies = [];

var yAxisWidth = 100;
var plotStartX = yAxisWidth;
var plotWidth = 950;
var plotHeight = 500;

var timeWindow = 8000; // ms for how long we show data
var proximityThreshold = 30;
var maxConnections = 5;

var notesInRange = [];
var logMin = 0;
var logMax = 0;



// Pitch detection buffers
var rafID = null;
var buflen = 2048;
var buf = new Float32Array(buflen);

// For the readout in the Detector (optional usage)
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ===================== 17 Tonic Data =====================

/**
 * Map from each tonic name to the 7 pitch classes in its major scale.
 * e.g. "C" => [0, 2, 4, 5, 7, 9, 11]
 */
const majorScales = {
  "C":   [0, 2, 4, 5, 7, 9, 11],
  "C♯":  [1, 3, 5, 6, 8, 10, 0],
  "D♭":  [1, 3, 5, 6, 8, 10, 0],
  "D":   [2, 4, 6, 7, 9, 11, 1],
  "D♯":  [3, 5, 7, 8, 10, 0, 2],
  "E♭":  [3, 5, 7, 8, 10, 0, 2],
  "E":   [4, 6, 8, 9, 11, 1, 3],
  "F":   [5, 7, 9, 10, 0, 2, 4],
  "F♯":  [6, 8, 10, 11, 1, 3, 5],
  "G♭":  [6, 8, 10, 11, 1, 3, 5],
  "G":   [7, 9, 11, 0, 2, 4, 6],
  "G♯":  [8, 10, 0, 1, 3, 5, 7],
  "A♭":  [8, 10, 0, 1, 3, 5, 7],
  "A":   [9, 11, 1, 2, 4, 6, 8],
  "A♯":  [10, 0, 2, 3, 5, 7, 9],
  "B♭":  [10, 0, 2, 3, 5, 7, 9],
  "B":   [11, 1, 3, 4, 6, 8, 10]
};

/**
 * For each tonic, how the in-scale pitch classes are spelled (no slash).
 * e.g. scaleSpellings["B♭"][10] = "B♭"
 */
const scaleSpellings = {
  "C":   {0: "C",  2: "D",  4: "E",  5: "F",  7: "G",  9: "A",  11: "B"},
  "C♯":  {1: "C♯", 3: "D♯", 5: "E♯", 6: "F♯", 8: "G♯", 10:"A♯", 0: "B♯"},
  "D♭":  {1: "D♭", 3: "E♭", 5: "F", 6: "G♭", 8: "A♭", 10:"B♭", 0: "C"},
  "D":   {2: "D",  4: "E",  6: "F♯", 7: "G",  9: "A",  11:"B", 1: "C♯"},
  "D♯":  {3: "D♯", 5: "E♯", 7: "G", 8: "G♯", 10:"A♯", 0: "B♯", 2: "D"},
  "E♭":  {3: "E♭", 5: "F",  7: "G",  8: "A♭", 10:"B♭", 0: "C",  2: "D"},
  "E":   {4: "E",  6: "F♯", 8: "G♯", 9: "A",  11:"B",  1: "C♯", 3: "D♯"},
  "F":   {5: "F",  7: "G",  9: "A",  10:"B♭", 0: "C",  2: "D",  4: "E"},
  "F♯":  {6: "F♯", 8: "G♯", 10:"A♯",11:"B",  1: "C♯", 3: "D♯", 5:"E♯"},
  "G♭":  {6: "G♭", 8: "A♭", 10:"B♭",11:"C♭",1:"D♭",3:"E♭",5:"F"},
  "G":   {7: "G",  9: "A",  11:"B",  0: "C",  2: "D",  4: "E",  6: "F♯"},
  "G♯":  {8: "G♯", 10:"A♯", 0: "B♯",1:"C♯",3:"D♯",5:"E♯",7:"G"},
  "A♭":  {8: "A♭", 10:"B♭", 0: "C",  1:"D♭", 3:"E♭", 5:"F",  7:"G"},
  "A":   {9: "A",  11:"B",  1: "C♯", 2:"D",  4:"E",  6:"F♯", 8:"G♯"},
  "A♯":  {10:"A♯", 0:"B♯",2:"D",3:"D♯",5:"E♯",7:"G",9:"A"},
  "B♭":  {10:"B♭", 0:"C",  2:"D", 3:"E♭",5:"F",7:"G",9:"A"},
  "B":   {11:"B",  1:"C♯", 3:"D♯",4:"E", 6:"F♯",8:"G♯",10:"A♯"}
};

/**
 * For accidental pitches (not in the current major scale),
 * we display slash names if showAccidentals===true.
 */
const pitchNamesBoth = {
  0:  "C",
  1:  "C♯/D♭",
  2:  "D",
  3:  "D♯/E♭",
  4:  "E",
  5:  "F",
  6:  "F♯/G♭",
  7:  "G",
  8:  "G♯/A♭",
  9:  "A",
  10: "A♯/B♭",
  11: "B"
};

// ===================== Color Palette for PC 0..11 =====================
const labelBackgroundColors = {
  0:  "#f090ae",
  1:  "#f59383",
  2:  "#ea9e5e",
  3:  "#d0ae4e",
  4:  "#a8bd61",
  5:  "#76c788",
  6:  "#41cbb5",
  7:  "#33c6dc",
  8:  "#62bbf7",
  9:  "#94adff",
  10: "#bea0f3",
  11: "#dd95d6"
};



// ===================== Offsets & Scale Logic =====================

/**
 * Map from Tonic name -> pitch class 0..11 above C.
 */
const tonicToSemisFromC = {
  "C":   0,
  "C♯":  1,  "D♭": 1,
  "D":   2,
  "D♯":  3,  "E♭": 3,
  "E":   4,  "F♭": 4,  // F♭ enharmonically = E
  "E♯":  5,            // E♯ enharmonically = F
  "F":   5,
  "F♯":  6,  "G♭": 6,
  "G":   7,
  "G♯":  8,  "A♭": 8,
  "A":   9,
  "A♯":  10, "B♭": 10,
  "B":   11
};


// Column definitions
const defaultColumnA = [0, 2, 4, 6, 8, 10];
const defaultColumnB = [1, 3, 5, 7, 9, 11];

/**
 * getColumnA():
 * If the Tonic’s absolute pitch class (getCurrentTonicPC()) 
 * is in defaultColumnB => we swap them so Tonic is on the inside column.
 */
function getColumnA() {
  let tonicPC = getCurrentTonicPC();
  if (defaultColumnB.includes(tonicPC)) {
    return defaultColumnB;
  }
  return defaultColumnA;
}

function getColumnB() {
  let tonicPC = getCurrentTonicPC();
  if (defaultColumnB.includes(tonicPC)) {
    return defaultColumnA;
  }
  return defaultColumnB;
}


/**
 * Get the pitch class (0..11) of currentTonicName.
 */
function getCurrentTonicPC() {
  return tonicToSemisFromC[currentTonicName] || 0;
}

/**
 * Return offset pitch class relative to the Tonic.
 * offsetPC=0 => Tonic, offsetPC=7 => 5th, etc.
 */
function getOffsetPitchClass(midiNote) {
  let pc = midiNote % 12;
  let tonicPC = getCurrentTonicPC();
  return (pc - tonicPC + 12) % 12;
}

/**
 * Return true if the absolute PC is in the major scale of currentTonicName.
 */
function isInMajorScale(pc) {
  let scalePCs = majorScales[currentTonicName] || [];
  return scalePCs.includes(pc);
}

function getNoteName(midiNote) {
  let pc = midiNote % 12;
  if (isInMajorScale(pc)) {
    let mapObj = scaleSpellings[currentTonicName] || {};
    return mapObj[pc] || "";
  } else {
    if (showAccidentals) {
      return pitchNamesBoth[pc] || "";
    }
    return "";
  }
}

/**
 * Return the spelled label for a given MIDI note, 
 * depending on useScaleDegrees and showAccidentals.
 */
function getNoteLabel(midiNote) {
  const pc = midiNote % 12;

  // If degrees mode is on, show scale degrees instead of note names
  if (useScaleDegrees) {
    // The offsetPC is how many semitones above the current tonic
    // (0 means Tonic, 7 means the 5th, etc.)
    const offsetPC = getOffsetPitchClass(midiNote);

    // Maps offsetPC => "1", "#1/b2", "2", "#2/b3", "3", ...
    const degreeMap = {
      0: "1",
      1: "#1 / b2",
      2: "2",
      3: "#2 / b3",
      4: "3",
      5: "4",
      6: "#4 / b5",
      7: "5",
      8: "#5 / b6",
      9: "6",
      10: "#6 / b7",
      11: "7"
    };
    const label = degreeMap[offsetPC] || "";

    // Check if this pitch class is part of the current tonic’s major scale
    if (isInMajorScale(pc)) {
      // In-scale => offsetPC is one of [0,2,4,5,7,9,11]
      // Return the simple diatonic label (1..7)
      return label;
    } else {
      // Out-of-scale => only show if showAccidentals is ON
      return showAccidentals ? label : "";
    }

  } else {
    // Degrees toggle is OFF => use spelled note names.
    // (Your original code, but trimmed down here)
    if (isInMajorScale(pc)) {
      // In-scale => return from scaleSpellings
      const mapObj = scaleSpellings[currentTonicName] || {};
      return mapObj[pc] || "";
    } else {
      // Out-of-scale => only show if accidentals is ON
      if (showAccidentals) {
        return pitchNamesBoth[pc] || "";
      }
      return "";
    }
  }
}


// ===================== getLineStyle(offsetPC) =====================
/**
 * This switch “omits” certain lines by returning null 
 * for offsetPC=1,3,5,9,11, etc.
 * offsetPC=0 => red line, offsetPC=7 => greyRect, etc.
 */
function getLineStyle(offsetPC) {
  switch (offsetPC) {
    case 0:  // Tonic
      return { color: "#FF0000", dash: [], width: 2 }; 
    case 1:  
      return null;    // no line
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
    case 7:
      return "greyRect"; // fill grey row, no actual line
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

// ===================== Frequency Helpers =====================
function frequencyFromNoteNumber(note) {
  // A4=440 => MIDI 69
  return 440 * Math.pow(2, (note - 69) / 12);
}

// ===================== Drone Frequency Calculation =====================
function parseTonicToFrequency(tonicName, octave) {
  let semisFromC = tonicToSemisFromC[tonicName] || 0;
  let baseMidiC3 = 48; // "C3" => MIDI 48
  let midi = baseMidiC3 + semisFromC + 12 * (octave - 3);
  return frequencyFromNoteNumber(midi);
}
