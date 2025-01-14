// ===================== Global Variables & Basic Config =====================

// Audio
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

// Tonic & Toggles
var tonicOffset = 0;         // 0 => C, 1 => C#, etc.
var useScaleDegrees = false; // false => scientific pitch names, true => scale degrees
var showFlats = false;
var showSharps = false;

// DOM Elements
var detectorElem, canvasElem, pitchElem, noteElem, detuneElem, detuneAmount;

// Plot / Canvas
var plotCanvas = null;
var plotCtx = null;
var plotData = [];
var yAxisWidth = 100;
var plotStartX = yAxisWidth;
var plotWidth = 950;
var plotHeight = 500;
var plotMaxFreq = 700;
var minFreq = 87; // in Hz

// Note visualization
var noteCanvas = null;
var noteCtx = null;
var frequencies = [];
var proximityThreshold = 30;
var maxConnections = 5;
var timeWindow = 8000; // in ms

// Buffer for pitch detection
var rafID = null;
var buflen = 2048;
var buf = new Float32Array(buflen);

// Basic note names for the readout in the Detector
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// For generating the y-axis
var notesInRange = [];
var logMin = 0;
var logMax = 0;

// Font-size logic for diatonic vs non-diatonic pitch classes
const diatonicPCs = [0, 2, 4, 5, 7, 9, 11];
const nondiatonicPCs = [1, 3, 6, 8, 10];

// ===================== Color Palettes & Column Logic =====================
const labelBackgroundColors = {
  0: "#f090ae",
  1: "#f59383",
  2: "#ea9e5e",
  3: "#d0ae4e",
  4: "#a8bd61",
  5: "#76c788",
  6: "#41cbb5",
  7: "#33c6dc",
  8: "#62bbf7",
  9: "#94adff",
  10: "#bea0f3",
  11: "#dd95d6"
};

const noteColors = {
  0: "#f090ae",
  1: "#f59383",
  2: "#ea9e5e",
  3: "#d0ae4e",
  4: "#a8bd61",
  5: "#76c788",
  6: "#41cbb5",
  7: "#33c6dc",
  8: "#62bbf7",
  9: "#94adff",
  10: "#bea0f3",
  11: "#dd95d6"
};

const defaultColumnA = [0, 2, 4, 6, 8, 10];
const defaultColumnB = [1, 3, 5, 7, 9, 11];

function getColumnA() {
  // If the Tonic is in column B, swap
  if (defaultColumnB.includes(tonicOffset)) {
    return defaultColumnB;
  }
  return defaultColumnA;
}

function getColumnB() {
  if (defaultColumnB.includes(tonicOffset)) {
    return defaultColumnA;
  }
  return defaultColumnB;
}

// ===================== Sharps/Flats Names & Scale-Degree Logic =====================
const pitchNamesSharps = {
  0: "C",   1: "C♯", 2: "D",   3: "D♯", 4: "E",
  5: "F",   6: "F♯", 7: "G",   8: "G♯", 9: "A",
  10:"A♯",  11:"B"
};

const pitchNamesFlats = {
  0: "C",   1: "D♭", 2: "D",   3: "E♭", 4: "E",
  5: "F",   6: "G♭", 7: "G",   8: "A♭", 9: "A",
  10:"B♭",  11:"B"
};

const majorScaleOffsets = [0, 2, 4, 5, 7, 9, 11];

function isAccidentalOffsetPC(offsetPC) {
  return [1,3,6,8,10].includes(offsetPC);
}

const scaleDegreeLabels = {
  0:  { none:"1",    sharps:"1",     flats:"1",     both:"1"         },
  1:  { none:"",     sharps:"♯1",    flats:"♭2",    both:"♯1/♭2"     },
  2:  { none:"2",    sharps:"2",     flats:"2",     both:"2"         },
  3:  { none:"",     sharps:"♯2",    flats:"♭3",    both:"♯2/♭3"     },
  4:  { none:"3",    sharps:"3",     flats:"3",     both:"3"         },
  5:  { none:"4",    sharps:"4",     flats:"4",     both:"4"         },
  6:  { none:"",     sharps:"♯4",    flats:"♭5",    both:"♯4/♭5"     },
  7:  { none:"5",    sharps:"5",     flats:"5",     both:"5"         },
  8:  { none:"",     sharps:"♯5",    flats:"♭6",    both:"♯5/♭6"     },
  9:  { none:"6",    sharps:"6",     flats:"6",     both:"6"         },
  10: { none:"",     sharps:"♯6",    flats:"♭7",    both:"♯6/♭7"     },
  11: { none:"7",    sharps:"7",     flats:"7",     both:"7"         }
};

function getDynamicScaleDegree(offsetPC) {
  if (showFlats && showSharps) {
    return scaleDegreeLabels[offsetPC].both;
  } else if (showFlats) {
    return scaleDegreeLabels[offsetPC].flats;
  } else if (showSharps) {
    return scaleDegreeLabels[offsetPC].sharps;
  } else {
    return scaleDegreeLabels[offsetPC].none;
  }
}

function getDegreeLabel(offsetPC) {
  return getDynamicScaleDegree(offsetPC) || "";
}

function getOffsetPitchClass(midiNote) {
  let pc = midiNote % 12;
  return (pc - tonicOffset + 12) % 12;
}

function getLineStyle(offsetPC) {
  switch(offsetPC) {
    case 0:  return { color: "#FF0000", dash: [],    width: 2 };
    case 1:  return null;
    case 2:  return { color: "#000000", dash: [],    width: 1 };
    case 3:  return null;
    case 4:  return { color: "#000000", dash: [5,5], width: 1 };
    case 5:  return null;
    case 6:  return { color: "#000000", dash: [],    width: 1 };
    case 7:  return "greyRect";
    case 8:  return { color: "#000000", dash: [],    width: 1 };
    case 9:  return null;
    case 10: return { color: "#000000", dash: [],    width: 1 };
    case 11: return null;
    default: return null;
  }
}

// ===================== Small Frequency Helpers =====================
function frequencyFromNoteNumber(note) {
  // A4=440, A4 => MIDI 69
  return 440 * Math.pow(2, (note - 69) / 12);
}

function getAccidentalName(midi) {
  let pc = midi % 12;
  let offsetPC = getOffsetPitchClass(midi);
  let octave = Math.floor(midi / 12) - 1;

  let nameSharp = pitchNamesSharps[pc];
  let nameFlat  = pitchNamesFlats[pc];

  if (showFlats || showSharps) {
    if (showFlats && showSharps) {
      // "C♯/D♭"
      let joined = (nameSharp === nameFlat) ? nameSharp : (nameSharp + "/" + nameFlat);
      return joined + octave;
    } else if (showFlats) {
      return nameFlat + octave;
    } else {
      return nameSharp + octave;
    }
  } else {
    // neither => only if offsetPC is in majorScaleOffsets
    if (majorScaleOffsets.includes(offsetPC)) {
      return nameSharp + octave;
    } else {
      return "";
    }
  }
}
