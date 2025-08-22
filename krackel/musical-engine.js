/**
 * Musical KRACKEL Engine
 * Transforms typing into musical expression
 */

class MusicalEngine {
    constructor() {
        this.audioContext = null;
        this.currentSong = null;
        this.bpm = 120;
        this.beatCount = 0;
        this.keyboardLayout = 'piano'; // 'piano', 'guitar', 'drums', 'synth'
        this.instruments = new Map();
        this.soundSamples = new Map();
        this.isInitialized = false;
        
        // Musical scales and keys
        this.scales = {
            pentatonic: [0, 2, 4, 7, 9], // C, D, E, G, A
            major: [0, 2, 4, 5, 7, 9, 11], // C Major scale
            minor: [0, 2, 3, 5, 7, 8, 10], // C Minor scale
            blues: [0, 3, 5, 6, 7, 10] // Blues scale
        };
        
        // Key to note mapping (QWERTY keyboard)
        this.keyMappings = {
            piano: this.generatePianoMapping(),
            guitar: this.generateGuitarMapping(),
            drums: this.generateDrumMapping(),
            synth: this.generateSynthMapping()
        };
        
        // Song definitions with different musical contexts
        this.songs = {
            'rock_anthem': {
                name: 'Rock Anthem',
                bpm: 140,
                scale: 'pentatonic',
                key: 'A',
                layout: 'guitar',
                targetWords: ['rock', 'metal', 'fire', 'power', 'thunder'],
                beatPattern: [1, 0, 1, 0, 1, 1, 0, 1], // Strong beats
                chord_progression: ['A5', 'D5', 'E5', 'A5']
            },
            'piano_ballad': {
                name: 'Piano Ballad',
                bpm: 80,
                scale: 'major',
                key: 'C',
                layout: 'piano',
                targetWords: ['love', 'dream', 'hope', 'light', 'peace'],
                beatPattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0],
                chord_progression: ['C', 'Am', 'F', 'G']
            },
            'electronic_dance': {
                name: 'Electronic Dance',
                bpm: 128,
                scale: 'minor',
                key: 'Em',
                layout: 'synth',
                targetWords: ['dance', 'beat', 'pulse', 'neon', 'electric'],
                beatPattern: [1, 1, 1, 1, 1, 1, 1, 1], // Four on the floor
                chord_progression: ['Em', 'C', 'G', 'D']
            },
            'drum_solo': {
                name: 'Drum Solo',
                bpm: 120,
                scale: 'rhythm', // Special scale for percussion
                key: 'Kick',
                layout: 'drums',
                targetWords: ['boom', 'crash', 'slam', 'bang', 'thud'],
                beatPattern: [1, 0, 1, 0, 1, 0, 1, 1], // Rock beat pattern
                chord_progression: ['Kick', 'Snare', 'HiHat', 'Crash']
            }
        };
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.loadInstrumentSamples();
            this.isInitialized = true;
            console.log('Musical Engine initialized');
        } catch (error) {
            console.error('Failed to initialize Musical Engine:', error);
        }
    }

    generatePianoMapping() {
        // Map QWERTY keys to piano notes (chromatic)
        const keys = 'qwertyuiopasdfghjklzxcvbnm';
        const baseOctave = 4;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const mapping = {};
        
        for (let i = 0; i < keys.length; i++) {
            const noteIndex = i % 12;
            const octave = baseOctave + Math.floor(i / 12);
            const noteName = notes[noteIndex] + octave;
            const frequency = this.noteToFrequency(noteName);
            
            mapping[keys[i]] = {
                note: noteName,
                frequency: frequency,
                instrument: 'piano',
                volume: 0.7
            };
        }
        
        return mapping;
    }

    generateGuitarMapping() {
        // Map ALL 26 keys to guitar-style notes for complete coverage
        const keys = 'qwertyuiopasdfghjklzxcvbnm';
        const mapping = {};
        
        // Guitar note pattern: mix of power chords, single notes, and leads
        const guitarNotes = [
            // Power chord section (typical rock rhythm)
            { note: 'E3', frequency: 164.81, type: 'power_chord' },  // q
            { note: 'F3', frequency: 174.61, type: 'power_chord' },  // w  
            { note: 'G3', frequency: 196.00, type: 'power_chord' },  // e
            { note: 'A3', frequency: 220.00, type: 'power_chord' },  // r
            { note: 'B3', frequency: 246.94, type: 'power_chord' },  // t
            { note: 'C4', frequency: 261.63, type: 'power_chord' },  // y
            { note: 'D4', frequency: 293.66, type: 'power_chord' },  // u
            { note: 'E4', frequency: 329.63, type: 'power_chord' },  // i
            { note: 'F4', frequency: 349.23, type: 'power_chord' },  // o
            { note: 'G4', frequency: 392.00, type: 'power_chord' },  // p
            
            // Single note section (rhythm guitar)
            { note: 'A2', frequency: 110.00, type: 'single' },       // a
            { note: 'B2', frequency: 123.47, type: 'single' },       // s
            { note: 'C3', frequency: 130.81, type: 'single' },       // d
            { note: 'D3', frequency: 146.83, type: 'single' },       // f
            { note: 'E3', frequency: 164.81, type: 'single' },       // g
            { note: 'F3', frequency: 174.61, type: 'single' },       // h
            { note: 'G3', frequency: 196.00, type: 'single' },       // j
            { note: 'A3', frequency: 220.00, type: 'single' },       // k
            { note: 'B3', frequency: 246.94, type: 'single' },       // l
            
            // Lead section (guitar solos)
            { note: 'C4', frequency: 261.63, type: 'lead' },         // z
            { note: 'D4', frequency: 293.66, type: 'lead' },         // x
            { note: 'E4', frequency: 329.63, type: 'lead' },         // c
            { note: 'F4', frequency: 349.23, type: 'lead' },         // v
            { note: 'G4', frequency: 392.00, type: 'lead' },         // b
            { note: 'A4', frequency: 440.00, type: 'lead' },         // n
            { note: 'B4', frequency: 493.88, type: 'lead' },         // m
        ];
        
        // Map each key to a guitar note
        for (let i = 0; i < keys.length; i++) {
            const noteData = guitarNotes[i];
            mapping[keys[i]] = {
                note: noteData.note,
                frequency: noteData.frequency,
                instrument: 'guitar',
                type: noteData.type,
                volume: 0.7
            };
        }
        
        return mapping;
    }

    generateDrumMapping() {
        // Map ALL 26 keys to complete drum kit for full coverage
        const keys = 'qwertyuiopasdfghjklzxcvbnm';
        const mapping = {};
        
        // Complete drum kit sounds
        const drumSounds = [
            // Kick drum section
            { note: 'Kick1', frequency: 60, type: 'kick' },           // q
            { note: 'Kick2', frequency: 65, type: 'kick' },           // w
            { note: 'Kick3', frequency: 70, type: 'kick' },           // e
            { note: 'SubKick', frequency: 50, type: 'kick' },         // r
            
            // Snare section  
            { note: 'Snare1', frequency: 200, type: 'snare' },        // t
            { note: 'Snare2', frequency: 220, type: 'snare' },        // y
            { note: 'Snare3', frequency: 240, type: 'snare' },        // u
            { note: 'SideStick', frequency: 180, type: 'snare' },     // i
            
            // Hi-hat section
            { note: 'ClosedHat1', frequency: 8000, type: 'hihat' },   // o
            { note: 'ClosedHat2', frequency: 8500, type: 'hihat' },   // p
            { note: 'OpenHat1', frequency: 9000, type: 'openhat' },   // a
            { note: 'OpenHat2', frequency: 9500, type: 'openhat' },   // s
            
            // Tom section
            { note: 'HighTom1', frequency: 180, type: 'tom' },        // d
            { note: 'HighTom2', frequency: 160, type: 'tom' },        // f
            { note: 'MidTom1', frequency: 140, type: 'tom' },         // g
            { note: 'MidTom2', frequency: 120, type: 'tom' },         // h
            { note: 'FloorTom1', frequency: 100, type: 'tom' },       // j
            { note: 'FloorTom2', frequency: 80, type: 'tom' },        // k
            
            // Cymbal section
            { note: 'Crash1', frequency: 12000, type: 'crash' },      // l
            { note: 'Crash2', frequency: 11000, type: 'crash' },      // z
            { note: 'Ride1', frequency: 10000, type: 'ride' },        // x
            { note: 'Ride2', frequency: 10500, type: 'ride' },        // c
            { note: 'China', frequency: 13000, type: 'crash' },       // v
            { note: 'Splash', frequency: 14000, type: 'crash' },      // b
            
            // Percussion section
            { note: 'Cowbell', frequency: 800, type: 'percussion' },  // n
            { note: 'Clap', frequency: 300, type: 'percussion' }      // m
        ];
        
        // Map each key to a drum sound
        for (let i = 0; i < keys.length; i++) {
            const drumData = drumSounds[i];
            mapping[keys[i]] = {
                note: drumData.note,
                frequency: drumData.frequency,
                instrument: 'drums',
                type: drumData.type,
                volume: 0.8
            };
        }
        
        // Add spacebar as main kick
        mapping[' '] = {
            note: 'MainKick',
            frequency: 60,
            instrument: 'drums',
            type: 'kick',
            volume: 1.0
        };
        
        return mapping;
    }

    generateSynthMapping() {
        // Synthesizer mapping with electronic sounds
        const mapping = {};
        const keys = 'qwertyuiopasdfghjklzxcvbnm';
        
        for (let i = 0; i < keys.length; i++) {
            const frequency = 200 + (i * 50); // Linear frequency progression
            mapping[keys[i]] = {
                note: `Synth${i}`,
                frequency: frequency,
                instrument: 'synth',
                waveform: i % 4 === 0 ? 'saw' : i % 4 === 1 ? 'square' : i % 4 === 2 ? 'triangle' : 'sine',
                filter: 'lowpass',
                filterFreq: 1000 + (i * 100)
            };
        }
        
        return mapping;
    }

    noteToFrequency(note) {
        // Convert note name to frequency (A4 = 440Hz)
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = parseInt(note.slice(-1));
        const noteName = note.slice(0, -1);
        const noteIndex = noteNames.indexOf(noteName);
        
        if (noteIndex === -1) return 440; // Default to A4
        
        // Calculate frequency using equal temperament
        const a4 = 440;
        const semitoneOffset = (octave - 4) * 12 + (noteIndex - 9); // A is index 9
        return a4 * Math.pow(2, semitoneOffset / 12);
    }

    async loadInstrumentSamples() {
        // For now, we'll use synthesized sounds
        // Later we can load actual audio samples
        console.log('Loading instrument samples...');
        
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.soundSamples.set('piano', 'synthesized');
        this.soundSamples.set('guitar', 'synthesized');
        this.soundSamples.set('drums', 'synthesized');
        this.soundSamples.set('synth', 'synthesized');
        
        console.log('Instrument samples loaded');
    }

    setSong(songId) {
        if (this.songs[songId]) {
            this.currentSong = this.songs[songId];
            this.bpm = this.currentSong.bpm;
            this.keyboardLayout = this.currentSong.layout;
            console.log(`Song set to: ${this.currentSong.name}`);
            return true;
        }
        return false;
    }

    playKey(key, velocity = 1.0) {
        if (!this.isInitialized || !this.audioContext) return;
        
        const mapping = this.keyMappings[this.keyboardLayout];
        const keyData = mapping[key.toLowerCase()];
        
        if (!keyData) return null;
        
        // Play the sound
        this.synthesizeNote(keyData, velocity);
        
        return {
            note: keyData.note,
            frequency: keyData.frequency,
            instrument: keyData.instrument,
            timing: this.getCurrentBeatPosition()
        };
    }

    synthesizeNote(keyData, velocity = 1.0) {
        const { frequency, instrument, waveform = 'sine', type } = keyData;
        
        try {
            const now = this.audioContext.currentTime;
            
            if (instrument === 'drums') {
                // Special drum synthesis with realistic envelopes
                this.synthesizeDrumSound(keyData, velocity, now);
            } else {
                // Regular instrument synthesis
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Set waveform based on instrument
                if (instrument === 'guitar') {
                    oscillator.type = 'sawtooth';
                    // Add some distortion effect
                    const distortion = this.audioContext.createWaveShaper();
                    oscillator.connect(distortion);
                    distortion.connect(gainNode);
                } else if (instrument === 'synth') {
                    oscillator.type = waveform || 'sawtooth';
                    // Add filter for synth sounds
                    const filter = this.audioContext.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = keyData.filterFreq || 1000;
                    oscillator.connect(filter);
                    filter.connect(gainNode);
                } else {
                    oscillator.type = 'triangle'; // Piano-like
                }
                
                oscillator.frequency.value = frequency;
                
                // ADSR envelope
                const attack = 0.01;
                const decay = 0.1;
                const sustain = 0.7;
                const release = 0.3;
                
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(velocity * 0.3, now + attack);
                gainNode.gain.linearRampToValueAtTime(velocity * 0.3 * sustain, now + attack + decay);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release);
                
                oscillator.start(now);
                oscillator.stop(now + attack + decay + release);
            }
            
        } catch (error) {
            console.error('Error synthesizing note:', error);
        }
    }

    synthesizeDrumSound(keyData, velocity, now) {
        const { frequency, type } = keyData;
        
        if (type === 'kick') {
            // Kick drum: low frequency with pitch sweep
            this.createKickDrum(frequency, velocity, now);
        } else if (type === 'snare') {
            // Snare: noise + tone
            this.createSnareDrum(frequency, velocity, now);
        } else if (type === 'hihat' || type === 'openhat') {
            // Hi-hat: high frequency noise
            this.createHiHat(frequency, velocity, now, type === 'openhat');
        } else if (type === 'crash' || type === 'ride') {
            // Cymbal: metallic shimmer
            this.createCymbal(frequency, velocity, now);
        } else if (type === 'tom') {
            // Tom: pitched drum
            this.createTom(frequency, velocity, now);
        } else {
            // Generic percussion
            this.createGenericPercussion(frequency, velocity, now);
        }
    }

    createKickDrum(baseFreq, velocity, now) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFreq * 2, now);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.1);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    createSnareDrum(baseFreq, velocity, now) {
        // Tone component
        const toneOsc = this.audioContext.createOscillator();
        const toneGain = this.audioContext.createGain();
        
        toneOsc.connect(toneGain);
        toneGain.connect(this.audioContext.destination);
        
        toneOsc.type = 'triangle';
        toneOsc.frequency.value = baseFreq;
        
        toneGain.gain.setValueAtTime(0, now);
        toneGain.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.01);
        toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        toneOsc.start(now);
        toneOsc.stop(now + 0.15);
        
        // Noise component
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.3;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = baseFreq * 8;
        
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        noiseSource.start(now);
    }

    createHiHat(baseFreq, velocity, now, isOpen) {
        const duration = isOpen ? 0.3 : 0.1;
        
        // Generate noise for hi-hat
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.2;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.audioContext.destination);
        
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = baseFreq;
        
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(velocity * 0.3, now + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noiseSource.start(now);
    }

    createCymbal(baseFreq, velocity, now) {
        // Multiple oscillators for metallic sound
        for (let i = 0; i < 6; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.type = 'square';
            osc.frequency.value = baseFreq * (1 + i * 0.7) * (0.5 + Math.random() * 0.5);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(velocity * 0.1 / (i + 1), now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            osc.start(now);
            osc.stop(now + 0.8);
        }
    }

    createTom(baseFreq, velocity, now) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFreq * 1.5, now);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.1);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.6, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    createGenericPercussion(baseFreq, velocity, now) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.value = baseFreq;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.4, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    analyzeWordMelody(word) {
        if (!this.currentSong) return null;
        
        const mapping = this.keyMappings[this.keyboardLayout];
        const melody = [];
        let harmonicScore = 0;
        
        // Convert word to musical phrase
        for (let i = 0; i < word.length; i++) {
            const char = word[i].toLowerCase();
            const keyData = mapping[char];
            
            if (keyData) {
                melody.push({
                    char: char,
                    note: keyData.note,
                    frequency: keyData.frequency,
                    position: i
                });
                
                // Calculate harmonic score based on scale compatibility
                if (this.isInScale(keyData.note, this.currentSong.scale, this.currentSong.key)) {
                    harmonicScore += 10;
                }
            }
        }
        
        return {
            word: word,
            melody: melody,
            harmonicScore: harmonicScore,
            isMusical: harmonicScore > word.length * 5 // Threshold for "musical"
        };
    }

    isInScale(note, scale, key) {
        // Simplified scale checking
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const keyIndex = noteNames.indexOf(key);
        const noteIndex = noteNames.indexOf(note.replace(/\d/, ''));
        const scalePattern = this.scales[scale];
        
        if (keyIndex === -1 || noteIndex === -1 || !scalePattern) return false;
        
        const relativeNote = (noteIndex - keyIndex + 12) % 12;
        return scalePattern.includes(relativeNote);
    }

    getCurrentBeatPosition() {
        // Return current position in the beat (0-1)
        const beatLength = (60 / this.bpm) * 1000; // ms per beat
        const currentTime = Date.now();
        return (currentTime % beatLength) / beatLength;
    }

    calculateTimingScore(beatPosition) {
        // Perfect timing is on the beat (0) or half beat (0.5)
        const distances = [
            Math.abs(beatPosition),
            Math.abs(beatPosition - 0.5),
            Math.abs(beatPosition - 1.0)
        ];
        
        const closestDistance = Math.min(...distances);
        
        // Score from 0-100 based on timing accuracy
        if (closestDistance < 0.1) return 100; // Perfect
        if (closestDistance < 0.2) return 80;  // Great
        if (closestDistance < 0.3) return 60;  // Good
        if (closestDistance < 0.4) return 40;  // Okay
        return 20; // Off-beat
    }

    getAvailableSongs() {
        return Object.keys(this.songs).map(id => ({
            id: id,
            name: this.songs[id].name,
            bpm: this.songs[id].bpm,
            style: this.songs[id].layout
        }));
    }

    // AI Music Generation (placeholder for future implementation)
    async generateMelodyForWord(word) {
        // Future: Use AI to generate optimal melody for given word
        // For now, return basic analysis
        return this.analyzeWordMelody(word);
    }
}

// Export for use in main game
window.MusicalEngine = MusicalEngine;
