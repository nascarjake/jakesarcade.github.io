class PatternHero {
    constructor() {
        this.gameState = 'menu'; // menu, song-select, playing, paused, gameover
        this.score = 0;
        this.combo = 1;
        this.bestCombo = 1;
        this.timeLeft = 60;
        this.gameTimer = null;
        this.currentPattern = '';
        this.totalPatterns = 0;
        this.longestPattern = 0;
        
        // Musical Engine Integration
        this.musicalEngine = new MusicalEngine();
        this.currentSong = null;
        this.musicalScore = 0; // Additional score for musical harmony
        this.beatAccuracy = [];
        
        // Advanced Pattern AI Integration
        this.patternAI = null; // Will be initialized after musicalEngine
        this.patternSuggestions = [];
        this.lastPatternAnalysis = null;
        
        // Enhanced rhythm game elements
        this.selectedBPM = 120; // User-selected BPM
        this.bpm = 120; // Current active BPM 
        this.beatDuration = 60000 / 120; // Milliseconds per beat = 500ms (separate from timer ID)
        this.beatIntervalId = null; // Timer ID for old system
        this.beatTimer = null; // Timer ID for new system
        this.currentBeat = 0;
        this.lastBeatTime = 0;
        this.fallingNotes = [];
        this.gameMode = 'freestyle'; // 'freestyle' or 'guided'
        this.guidedPattern = '';
        this.patternStartTime = 0;
        this.difficulty = 1;
        
        // Pattern library for guided mode
        this.patternLibrary = [
            // Level 1 - Simple
            'na', 'ba', 'da', 'ta', 'la',
            // Level 2 - Medium
            'nana', 'baba', 'dada', 'tata', 'lala',
            'abab', 'cdcd', 'efef',
            // Level 3 - Complex  
            'nanana', 'bababa', 'dadada',
            'abcabc', 'defdef', 'ghighi',
            // Level 4 - Advanced
            'nananana', 'babababa', 'dadadada',
            'abcdabcd', 'efghefgh', 'ijklijkl',
            // Level 5 - Expert
            'hello', 'world', 'pattern', 'rhythm',
            'music', 'dance', 'groove', 'style'
        ];
        
        // Audio system
        this.audioContext = null;
        this.initializeAudio();
        
        this.initializeElements();
        this.attachEventListeners();
        this.showScreen('menu');
    }

    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playSound(frequency, duration = 0.1, type = 'sine', volume = 0.1) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playBeatSound() {
        this.playSound(200, 0.1, 'sine', 0.03);
    }

    playTypeSound() {
        const baseFreq = 400 + Math.random() * 200;
        this.playSound(baseFreq, 0.05, 'square', 0.04);
    }

    playPatternHitSound() {
        // Success sound - ascending notes
        [440, 554, 659].forEach((freq, i) => {
            setTimeout(() => this.playSound(freq, 0.15, 'triangle', 0.08), i * 100);
        });
    }

    playPatternMissSound() {
        // Miss sound - descending dissonant notes
        [300, 250, 200].forEach((freq, i) => {
            setTimeout(() => this.playSound(freq, 0.1, 'square', 0.05), i * 50);
        });
    }

    playFreestylePatternSound(length) {
        if (length >= 4) {
            // Good freestyle pattern
            const baseFreq = 440 + (length * 20);
            this.playSound(baseFreq, 0.2, 'triangle', 0.06);
        }
    }

    initializeElements() {
        // Screen elements
        this.screens = {
            menu: document.getElementById('menu-screen'),
            songSelect: document.getElementById('song-select-screen'),
            game: document.getElementById('game-screen'),
            gameover: document.getElementById('gameover-screen')
        };

        // Menu elements
        this.startGameBtn = document.getElementById('start-game');
        this.instructionsBtn = document.getElementById('instructions');
        this.instructionsModal = document.getElementById('instructions-modal');
        this.closeInstructionsBtn = document.getElementById('close-instructions');

        // Song selection elements
        this.songsGrid = document.getElementById('songs-grid');
        this.backToMainBtn = document.getElementById('back-to-main');
        
        // BPM selection elements
        this.bpmSlider = document.getElementById('bpm-slider');
        this.bpmDisplay = document.getElementById('bpm-display');
        this.bpmPresets = document.querySelectorAll('.bpm-preset');

        // Game elements
        this.currentScoreEl = document.getElementById('current-score');
        this.currentComboEl = document.getElementById('current-combo');
        this.timeLeftEl = document.getElementById('time-left');
        this.typedTextEl = document.getElementById('typed-text');
        this.scorePopupsEl = document.getElementById('score-popups');
        this.patternFeedbackEl = document.getElementById('pattern-feedback');
        this.pauseBtn = document.getElementById('pause-game');
        this.patternHighway = document.querySelector('.pattern-highway');
        this.hitZone = document.querySelector('.hit-zone');
        this.patternStatusEl = document.getElementById('pattern-status');
        this.currentPatternTextEl = document.getElementById('current-pattern-text');
        this.currentSongInfoEl = document.getElementById('current-song-info');
        this.bpmInfoEl = document.getElementById('bpm-info');

        // Game over elements
        this.finalScoreEl = document.getElementById('final-score');
        this.bestComboEl = document.getElementById('best-combo');
        this.longestPatternEl = document.getElementById('longest-pattern');
        this.totalPatternsEl = document.getElementById('total-patterns');
        this.playAgainBtn = document.getElementById('play-again');
        this.backToMenuBtn = document.getElementById('back-to-menu');
    }

    attachEventListeners() {
        // Menu listeners
        this.startGameBtn.addEventListener('click', () => this.showSongSelection());
        this.instructionsBtn.addEventListener('click', () => this.showInstructions());
        this.closeInstructionsBtn.addEventListener('click', () => this.hideInstructions());

        // Song selection listeners
        this.backToMainBtn.addEventListener('click', () => this.showScreen('menu'));
        
        // BPM selection listeners
        this.bpmSlider.addEventListener('input', (e) => this.updateBPM(parseInt(e.target.value)));
        this.bpmPresets.forEach(preset => {
            preset.addEventListener('click', (e) => {
                const bpm = parseInt(e.target.dataset.bpm);
                this.updateBPM(bpm);
                this.bpmSlider.value = bpm;
            });
        });

        // Game listeners
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Game over listeners
        this.playAgainBtn.addEventListener('click', () => this.startGame());
        this.backToMenuBtn.addEventListener('click', () => this.showScreen('menu'));

        // Click outside modal to close
        this.instructionsModal.addEventListener('click', (e) => {
            if (e.target === this.instructionsModal) {
                this.hideInstructions();
            }
        });
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
        this.gameState = screenName === 'game' ? 'playing' : screenName === 'songSelect' ? 'song-select' : screenName;
    }

    // BPM Management
    updateBPM(newBPM) {
        this.selectedBPM = newBPM;
        this.bpm = newBPM;
        this.beatDuration = 60000 / newBPM; // milliseconds per beat (FIXED VARIABLE NAME!)
        
        // Debug logging for timing verification
        console.log(`BPM updated to ${newBPM}, beat duration: ${this.beatDuration}ms`);
        
        // Update display
        this.bpmDisplay.textContent = newBPM;
        if (this.bpmInfoEl) {
            this.bpmInfoEl.textContent = `${newBPM} BPM`;
        }
        
        // Update musical engine if initialized
        if (this.musicalEngine && this.currentSong) {
            this.musicalEngine.songs[this.currentSong].bpm = newBPM;
        }
        
        // Update preset button highlighting
        this.bpmPresets.forEach(preset => {
            preset.classList.remove('selected');
            if (parseInt(preset.dataset.bpm) === newBPM) {
                preset.classList.add('selected');
            }
        });
        
        // Update beat visualization timing
        this.updateBeatVisualization();
    }

    updateBeatVisualization() {
        // Clear existing beat timer
        if (this.beatTimer) {
            clearInterval(this.beatTimer);
        }
        
        // Start new beat timer if in game (no longer depends on beatIndicatorEl)
        if (this.gameState === 'playing') {
            this.lastBeatTime = Date.now();
            this.beatTimer = setInterval(() => {
                this.triggerBeatVisual();
            }, this.beatDuration); // FIXED: Now uses correct duration variable!
        }
    }

    triggerBeatVisual() {
        // Debug timing verification
        const now = Date.now();
        const timeSinceLastBeat = now - this.lastBeatTime;
        console.log(`Beat fired! Expected: ${this.beatDuration}ms, Actual: ${timeSinceLastBeat}ms, Beat: ${this.currentBeat % 4 + 1}`);
        
        // Pulse the current pattern display (FREESTYLE/Start typing area)
        const currentPatternDisplayEl = document.querySelector('.current-pattern-display');
        if (currentPatternDisplayEl) {
            // Add beat pulse class to current pattern display
            currentPatternDisplayEl.classList.add('beat-pulse');
            
            // Remove pulse class after animation
            setTimeout(() => {
                currentPatternDisplayEl.classList.remove('beat-pulse');
            }, 200);
        }
        
        // Play metronome sound
        this.playMetronomeSound();
        
        // Update falling notes (from old startBeat system)
        this.updateFallingNotes();
        
        this.lastBeatTime = now;
    }

    playMetronomeSound() {
        // Clear metronome with strong beats
        const metronomeEnabled = true;
        
        if (!metronomeEnabled) {
            this.currentBeat++;
            return;
        }
        
        const beatInMeasure = this.currentBeat % 4;
        
        if (beatInMeasure === 0) {
            // Strong kick sound on beat 1 (downbeat)
            this.playSound(150, 0.15, 'sine', 0.08);
        } else {
            // Clear tick on other beats  
            this.playSound(600, 0.08, 'sine', 0.04);
        }
        
        this.currentBeat++;
    }

    async showSongSelection() {
        // Initialize musical engine if not already done
        if (!this.musicalEngine.isInitialized) {
            await this.musicalEngine.initialize();
        }
        
        // Initialize Pattern AI Engine
        if (!this.patternAI) {
            this.patternAI = new PatternAIEngine(this.musicalEngine);
            this.patternAI.initialize();
        }
        
        this.populateSongSelection();
        this.showScreen('songSelect');
    }

    populateSongSelection() {
        const songs = this.musicalEngine.getAvailableSongs();
        this.songsGrid.innerHTML = '';
        
        songs.forEach(song => {
            const songCard = this.createSongCard(song);
            this.songsGrid.appendChild(songCard);
        });
    }

    createSongCard(song) {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.setAttribute('data-style', song.style);
        card.setAttribute('data-song-id', song.id);
        
        const instrumentIcons = {
            guitar: '🎸',
            piano: '🎹',
            synth: '🎛️',
            drums: '🥁'
        };
        
        card.innerHTML = `
            <div class="song-instrument-icon">${instrumentIcons[song.style] || '🎵'}</div>
            <div class="song-name">${song.name}</div>
            <div class="song-details">
                <div class="song-detail">
                    <span class="song-detail-label">BPM:</span>
                    <span class="song-detail-value">${song.bpm}</span>
                </div>
                <div class="song-detail">
                    <span class="song-detail-label">Style:</span>
                    <span class="song-detail-value">${song.style.toUpperCase()}</span>
                </div>
                <div class="song-detail">
                    <span class="song-detail-label">Difficulty:</span>
                    <span class="song-detail-value">${this.getSongDifficulty(song.bpm)}</span>
                </div>
            </div>
            <div class="song-preview">
                Click to start jamming with ${song.style} sounds!
                <br>Type words to create melodies!
            </div>
        `;
        
        // Add click listener
        card.addEventListener('click', () => this.selectSong(song.id));
        
        return card;
    }

    getSongDifficulty(bpm) {
        if (bpm < 100) return 'CHILL';
        if (bpm < 120) return 'MODERATE';
        if (bpm < 140) return 'ENERGETIC';
        return 'INTENSE';
    }

    async selectSong(songId) {
        this.currentSong = songId;
        this.musicalEngine.setSong(songId);
        
        // Use user-selected BPM instead of song default
        this.bpm = this.selectedBPM;
        this.musicalEngine.songs[songId].bpm = this.selectedBPM;
        
        // Update the current song info in the UI
        const songData = this.musicalEngine.currentSong;
        if (songData) {
            this.currentSongInfoEl.textContent = `🎵 ${songData.name} (${songData.layout.toUpperCase()}) - ${this.selectedBPM} BPM`;
            this.currentSongInfoEl.style.color = '#ff6600';
        }
        
        // Start the game with selected song
        this.startGame();
    }

    showInstructions() {
        this.instructionsModal.classList.remove('hidden');
    }

    hideInstructions() {
        this.instructionsModal.classList.add('hidden');
    }

    startGame() {
        this.resetGame();
        this.showScreen('game');
        
        // Set up BPM from user selection
        this.bpm = this.selectedBPM;
        if (this.bpmInfoEl) {
            this.bpmInfoEl.textContent = `${this.bpm} BPM`;
        }
        
        this.startTimer();
        this.updateBeatVisualization(); // Start enhanced beat visualization (replaces startBeat)
        this.scheduleNextPattern();
        
        // Resume audio context if needed
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    resetGame() {
        this.score = 0;
        this.musicalScore = 0;
        this.beatAccuracy = [];
        this.combo = 1;
        this.bestCombo = 1;
        this.timeLeft = 60;
        this.currentPattern = '';
        this.totalPatterns = 0;
        this.longestPattern = 0;
        this.currentBeat = 0;
        this.fallingNotes = [];
        this.gameMode = 'freestyle';
        this.difficulty = 1;
        this.updateDisplay();
        this.clearTypedText();
        this.clearPatternHighway();
        this.updatePatternDisplay();
        
        // Clean up any musical stats from previous game
        const existingMusicalStats = document.querySelectorAll('.stat');
        existingMusicalStats.forEach(stat => {
            if (stat.textContent.includes('Musical Harmony') || stat.textContent.includes('Beat Accuracy')) {
                stat.remove();
            }
        });
    }

    startTimer() {
        if (this.gameTimer) clearInterval(this.gameTimer);
        
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            // Increase difficulty over time
            this.difficulty = Math.min(5, Math.floor((60 - this.timeLeft) / 12) + 1);
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    startBeat() {
        if (this.beatIntervalId) clearInterval(this.beatIntervalId);
        
        const beatDuration = (60 / this.bpm) * 1000; // milliseconds per beat
        
        this.beatIntervalId = setInterval(() => {
            this.currentBeat++;
            this.playBeatSound();
            // Beat visual now handled by new system that pulses score display
            
            // Update falling notes
            this.updateFallingNotes();
            
        }, beatDuration);
    }

    // pulseBeatIndicator function removed - now using score display pulse instead

    scheduleNextPattern() {
        if (this.gameState !== 'playing') return;
        
        const baseDelay = 4000; // 4 seconds base
        const difficultyMultiplier = Math.max(0.3, 1 - (this.difficulty - 1) * 0.15);
        const delay = baseDelay * difficultyMultiplier;
        
        setTimeout(() => {
            if (this.gameState === 'playing') {
                this.spawnGuidedPattern();
                this.scheduleNextPattern();
            }
        }, delay);
    }

    spawnGuidedPattern() {
        const patternsByDifficulty = {
            1: this.patternLibrary.slice(0, 5),   // Simple
            2: this.patternLibrary.slice(5, 12),  // Medium
            3: this.patternLibrary.slice(12, 18), // Complex
            4: this.patternLibrary.slice(18, 25), // Advanced
            5: this.patternLibrary.slice(25)      // Expert
        };
        
        const availablePatterns = patternsByDifficulty[this.difficulty] || patternsByDifficulty[5];
        const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        
        this.createFallingNote(pattern, 'guided');
    }

    createFallingNote(pattern, type = 'guided') {
        const note = document.createElement('div');
        note.className = `pattern-note ${type}`;
        note.textContent = pattern;
        note.dataset.pattern = pattern;
        note.dataset.type = type;
        note.dataset.startTime = Date.now();
        
        // Animation duration based on difficulty (faster = harder)
        const baseDuration = 4000; // 4 seconds
        const duration = baseDuration - (this.difficulty - 1) * 300;
        note.style.animationDuration = `${duration}ms`;
        
        this.patternHighway.appendChild(note);
        this.fallingNotes.push(note);
        
        // Remove note after animation
        setTimeout(() => {
            if (note.parentNode) {
                note.parentNode.removeChild(note);
            }
            this.fallingNotes = this.fallingNotes.filter(n => n !== note);
        }, duration);
    }

    updateFallingNotes() {
        // Check if any notes are in the hit zone and missed
        this.fallingNotes.forEach(note => {
            const rect = note.getBoundingClientRect();
            const hitZoneRect = this.hitZone.getBoundingClientRect();
            
            // If note passed the hit zone without being hit
            if (rect.top > hitZoneRect.bottom + 20) {
                if (note.dataset.type === 'guided' && !note.dataset.hit) {
                    this.missPattern(note.dataset.pattern);
                    note.dataset.hit = 'missed';
                }
            }
        });
    }

    handleKeyPress(e) {
        if (this.gameState !== 'playing') return;
        
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            this.processCharacter(e.key);
        }
    }

    processCharacter(char) {
        this.currentPattern += char.toLowerCase();
        this.addCharacterToDisplay(char);
        
        // Play musical note for the key
        const musicalNote = this.musicalEngine.playKey(char.toLowerCase());
        if (musicalNote) {
            // Calculate timing score for musical accuracy
            const timingScore = this.musicalEngine.calculateTimingScore(musicalNote.timing);
            this.beatAccuracy.push(timingScore);
            
            // Show musical feedback if timing is good
            if (timingScore > 70) {
                this.showMusicalFeedback(timingScore, musicalNote.note);
            }
        } else {
            // Fallback to original typing sound if no musical mapping
            this.playTypeSound();
        }
        
        // Advanced Pattern AI Analysis
        if (this.patternAI) {
            const timestamp = Date.now();
            this.patternSuggestions = this.patternAI.recordKeystroke(char.toLowerCase(), timestamp, musicalNote);
            this.lastPatternAnalysis = this.patternAI.getCurrentAnalysis();
            
            // Update UI with new analysis
            this.updatePatternAnalysisUI();
            
            // Score based on AI-detected patterns
            this.scoreAdvancedPatterns();
        }
        
        this.updatePatternDisplay();
        
        // Check for guided pattern matches
        this.checkGuidedPatternHit();
        
        // Check for freestyle patterns with musical analysis (legacy + AI)
        if (this.gameMode === 'freestyle') {
            this.checkFreestylePattern();
            this.analyzeMusicalPattern();
        }
        
        // Reset pattern if it gets too long (now handled by AI, but keep for safety)
        if (this.currentPattern.length > 64) {
            this.resetCurrentPattern();
        }
    }

    checkGuidedPatternHit() {
        const notesInHitZone = this.fallingNotes.filter(note => {
            const rect = note.getBoundingClientRect();
            const hitZoneRect = this.hitZone.getBoundingClientRect();
            
            return rect.bottom >= hitZoneRect.top - 20 && 
                   rect.top <= hitZoneRect.bottom + 20 &&
                   note.dataset.type === 'guided' &&
                   !note.dataset.hit;
        });
        
        notesInHitZone.forEach(note => {
            const targetPattern = note.dataset.pattern;
            if (this.currentPattern.endsWith(targetPattern)) {
                this.hitPattern(targetPattern, note);
            }
        });
    }

    hitPattern(pattern, noteElement) {
        noteElement.dataset.hit = 'success';
        noteElement.style.background = 'linear-gradient(135deg, #00ff88, #33ff99)';
        noteElement.style.transform = 'scale(1.2)';
        
        const points = this.calculateGuidedPatternPoints(pattern);
        this.addScore(points, pattern, true);
        this.playPatternHitSound();
        
        this.combo += 0.5;
        this.updateCombo();
        
        this.showHitFeedback('PERFECT!');
        this.resetCurrentPattern();
        this.totalPatterns++;
        
        if (pattern.length > this.longestPattern) {
            this.longestPattern = pattern.length;
        }
    }

    missPattern(pattern) {
        this.playPatternMissSound();
        this.combo = Math.max(1, this.combo - 0.3);
        this.showHitFeedback('MISSED!');
    }

    checkFreestylePattern() {
        // Look for repeating patterns in freestyle mode
        if (this.currentPattern.length >= 4) {
            const pattern = this.findFreestylePattern();
            if (pattern) {
                const points = this.calculateFreestylePoints(pattern);
                this.addScore(points, pattern, false);
                this.playFreestylePatternSound(pattern.length);
                this.showPatternFeedback(`FREESTYLE: "${pattern}"`);
                this.totalPatterns++;
                
                if (pattern.length > this.longestPattern) {
                    this.longestPattern = pattern.length;
                }
            }
        }
    }

    findFreestylePattern() {
        const sequence = this.currentPattern;
        
        // Look for simple repetitions
        for (let len = 2; len <= Math.floor(sequence.length / 2); len++) {
            const pattern = sequence.slice(-len);
            const beforePattern = sequence.slice(-(len * 2), -len);
            
            if (pattern === beforePattern && pattern.length >= 2) {
                return pattern;
            }
        }
        
        // Look for word patterns (4+ characters that form common patterns)
        const words = ['hello', 'world', 'music', 'dance', 'rhythm', 'pattern'];
        for (const word of words) {
            if (sequence.includes(word)) {
                return word;
            }
        }
        
        return null;
    }

    calculateGuidedPatternPoints(pattern) {
        const basePoints = pattern.length * 100;
        const difficultyBonus = this.difficulty * 50;
        const timingBonus = 100; // Perfect timing bonus
        
        return basePoints + difficultyBonus + timingBonus;
    }

    calculateFreestylePoints(pattern) {
        const basePoints = pattern.length * 30;
        const creativityBonus = pattern.length > 4 ? pattern.length * 10 : 0;
        
        return basePoints + creativityBonus;
    }

    addScore(points, pattern, isGuided) {
        this.score += Math.floor(points * this.combo);
        this.showScorePopup(points, pattern, isGuided);
        this.updateDisplay();
    }

    showScorePopup(points, pattern, isGuided) {
        const popup = document.createElement('div');
        popup.className = `score-popup ${points > 200 ? 'big-score' : ''} ${isGuided ? 'guided' : 'freestyle'}`;
        
        let text = `+${Math.floor(points * this.combo)}`;
        if (this.combo > 1.5) text += ` x${Math.floor(this.combo * 10) / 10}`;
        
        popup.textContent = text;
        
        // Random position around center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        popup.style.left = (centerX + (Math.random() - 0.5) * 200) + 'px';
        popup.style.top = (centerY + (Math.random() - 0.5) * 150) + 'px';
        
        this.scorePopupsEl.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 2000);
    }

    showHitFeedback(message) {
        this.hitZone.textContent = message;
        this.hitZone.style.color = message === 'PERFECT!' ? '#00ff88' : '#ff0066';
        
        setTimeout(() => {
            this.hitZone.textContent = 'HIT ZONE';
            this.hitZone.style.color = '#ffffff';
        }, 500);
    }

    showPatternFeedback(message, className = 'default') {
        this.patternFeedbackEl.textContent = message;
        this.patternFeedbackEl.className = `pattern-feedback show ${className}`;
        
        setTimeout(() => {
            this.patternFeedbackEl.classList.remove('show');
        }, 2000);
    }

    updateCombo() {
        if (this.combo > this.bestCombo) {
            this.bestCombo = Math.floor(this.combo * 10) / 10;
        }
    }

    resetCurrentPattern() {
        this.currentPattern = '';
        this.updatePatternDisplay();
    }

    updatePatternDisplay() {
        if (this.currentPattern === '') {
            this.currentPatternTextEl.textContent = 'Start typing...';
            this.patternStatusEl.textContent = 'FREESTYLE';
        } else {
            this.currentPatternTextEl.textContent = this.currentPattern;
            this.patternStatusEl.textContent = `${this.currentPattern.length} chars`;
        }
    }

    addCharacterToDisplay(char) {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = char;
        this.typedTextEl.appendChild(charSpan);
        
        // Limit displayed characters
        const chars = this.typedTextEl.querySelectorAll('.char');
        if (chars.length > 20) {
            chars[0].remove();
        }
    }

    clearTypedText() {
        this.typedTextEl.innerHTML = '';
    }

    clearPatternHighway() {
        const notes = this.patternHighway.querySelectorAll('.pattern-note');
        notes.forEach(note => note.remove());
        this.fallingNotes = [];
    }

    analyzeMusicalPattern() {
        if (this.currentPattern.length >= 3) {
            const melody = this.musicalEngine.analyzeWordMelody(this.currentPattern);
            if (melody && melody.isMusical) {
                this.musicalScore += melody.harmonicScore;
                this.showPatternFeedback(`MELODIC: "${this.currentPattern}" +${melody.harmonicScore} harmony!`);
            }
        }
    }

    updatePatternAnalysisUI() {
        if (!this.lastPatternAnalysis) return;
        
        // Update detected patterns display
        const patternsDisplay = document.getElementById('detected-patterns');
        if (patternsDisplay) {
            const topPatterns = this.lastPatternAnalysis.detectedPatterns.slice(0, 5);
            patternsDisplay.innerHTML = topPatterns.map(pattern => 
                `<div class="pattern-item">
                    <span class="pattern-text">${pattern.pattern}</span>
                    <span class="pattern-score">${Math.round(pattern.score)}</span>
                    <span class="pattern-freq">×${pattern.frequency}</span>
                </div>`
            ).join('');
        }
        
        // Update rhythm analysis display
        const rhythmDisplay = document.getElementById('rhythm-analysis');
        if (rhythmDisplay) {
            const topRhythms = this.lastPatternAnalysis.rhythmPatterns.slice(0, 3);
            rhythmDisplay.innerHTML = topRhythms.map(rhythm => 
                `<div class="rhythm-item">
                    <span class="rhythm-pattern">${rhythm.pattern.join(' ')}</span>
                    <span class="rhythm-freq">×${rhythm.frequency}</span>
                </div>`
            ).join('');
        }
        
        // Update suggestions display
        const suggestionsDisplay = document.getElementById('pattern-suggestions');
        if (suggestionsDisplay && this.patternSuggestions.length > 0) {
            const topSuggestion = this.patternSuggestions[0];
            suggestionsDisplay.innerHTML = `
                <div class="suggestion-item">
                    <div class="suggestion-type">${topSuggestion.type.toUpperCase()}</div>
                    <div class="suggestion-text">${topSuggestion.suggestion}</div>
                    <div class="suggestion-desc">${topSuggestion.description}</div>
                </div>
            `;
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (suggestionsDisplay) {
                    suggestionsDisplay.innerHTML = '';
                }
            }, 5000);
        }
        
        // Update user style info
        const styleDisplay = document.getElementById('user-style');
        if (styleDisplay) {
            const style = this.lastPatternAnalysis.userStyle;
            styleDisplay.innerHTML = `
                <div class="style-item">Tempo: ${Math.round(style.averageTempo)} BPM</div>
                <div class="style-item">Complexity: ${style.patternComplexity}</div>
                <div class="style-item">Rhythm: ${style.rhythmPreference}</div>
            `;
        }
    }

    scoreAdvancedPatterns() {
        if (!this.lastPatternAnalysis) return;
        
        // Score based on AI-detected patterns (only new high-scoring patterns)
        const recentPatterns = this.lastPatternAnalysis.detectedPatterns || [];
        
        // Only score high-quality, fresh patterns (much stricter filtering)
        const newPatterns = recentPatterns.filter(pattern => {
            const timeSinceLastSeen = Date.now() - (pattern.lastSeen || 0);
            const qualityScore = pattern.qualityScore || 0;
            return pattern.score > 10 && // Higher score threshold
                   timeSinceLastSeen < 1000 && // Only very recent patterns (1 second)
                   qualityScore > 0.5 && // Only high-quality patterns
                   pattern.length >= 3; // Must be at least 3 characters
        });
        
        newPatterns.forEach(pattern => {
            // Award points for discovered patterns based on complexity and frequency
            const basePoints = pattern.length * 25; // Reduced base points to prevent spam
            const complexityBonus = Math.min(pattern.length * 10, 100); // Reduced bonus
            const frequencyBonus = Math.min(pattern.frequency * 5, 50); // Reduced bonus
            
            const totalPoints = Math.floor(basePoints + complexityBonus + frequencyBonus);
            
            // Only award points for significant patterns
            if (totalPoints > 50) {
                // Add to score
                this.score += totalPoints;
                
                // Show pattern discovery feedback (less frequently)
                if (Math.random() < 0.2) { // Only 20% chance to show feedback
                    this.showPatternFeedback(`✨ QUALITY PATTERN: "${pattern.pattern}" +${totalPoints}pts!`, 'ai-pattern');
                }
                
                // Update combo for good pattern work
                if (pattern.length >= 3) {
                    this.combo = Math.min(this.combo + 0.05, 5.0);
                }
            }
        });
        
        // Award points for good rhythm (less frequently)
        const rhythmPatterns = this.lastPatternAnalysis.rhythmPatterns || [];
        rhythmPatterns.forEach(rhythm => {
            if (rhythm.frequency >= 4 && Math.random() < 0.2) { // Less frequent, higher threshold
                const rhythmPoints = Math.floor(rhythm.frequency * 25);
                this.musicalScore += rhythmPoints;
                this.showPatternFeedback(`RHYTHM: +${rhythmPoints} rhythm!`, 'rhythm');
            }
        });
        
        // Show spam detection feedback occasionally
        const allPatterns = this.lastPatternAnalysis.detectedPatterns || [];
        const filteredOutPatterns = allPatterns.filter(pattern => {
            const timeSinceLastSeen = Date.now() - (pattern.lastSeen || 0);
            const qualityScore = pattern.qualityScore || 0;
            return !(pattern.score > 10 && timeSinceLastSeen < 1000 && qualityScore > 0.5 && pattern.length >= 3);
        });
        
        // Occasionally show why patterns are being filtered out
        if (filteredOutPatterns.length > 0 && Math.random() < 0.05) {
            this.showPatternFeedback(`🚫 Low quality patterns filtered`, 'spam-notice');
        }
        
        // Save patterns periodically
        if (Math.random() < 0.05) { // Reduced frequency: 5% chance each keystroke
            this.patternAI.saveUserPatterns();
        }
    }

    showMusicalFeedback(timingScore, note) {
        // Create timing feedback element
        const feedback = document.createElement('div');
        feedback.className = 'musical-timing-feedback';
        
        let message = '';
        let color = '';
        
        if (timingScore >= 90) {
            message = 'PERFECT!';
            color = '#00ff88';
        } else if (timingScore >= 80) {
            message = 'GREAT!';
            color = '#ffff00';
        } else {
            message = 'NICE!';
            color = '#ff8800';
        }
        
        feedback.textContent = `${message} ${note}`;
        feedback.style.cssText = `
            position: absolute;
            top: 60px;
            right: 120px;
            color: ${color};
            font-family: 'Bungee', cursive;
            font-size: 1rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 20;
            animation: musicalFeedbackFade 2s ease-out forwards;
        `;
        
        this.screens.game.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    updateDisplay() {
        this.currentScoreEl.textContent = (this.score + this.musicalScore).toLocaleString();
        this.currentComboEl.textContent = `x${Math.floor(this.combo * 10) / 10}`;
        this.timeLeftEl.textContent = this.timeLeft;
        
        // Update combo color based on value
        const comboEl = this.currentComboEl;
        if (this.combo >= 3) {
            comboEl.style.color = '#ff0066';
            comboEl.style.textShadow = '0 0 15px #ff0066';
        } else if (this.combo >= 2) {
            comboEl.style.color = '#ffff00';
            comboEl.style.textShadow = '0 0 15px #ffff00';
        } else {
            comboEl.style.color = '#00ff88';
            comboEl.style.textShadow = '0 0 10px #00ff88';
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameTimer);
            clearInterval(this.beatIntervalId); // Old beat system (FIXED VARIABLE NAME)
            clearInterval(this.beatTimer); // New beat system  
            this.pauseBtn.textContent = '▶';
            this.showMessage('PAUSED');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.startTimer();
            this.updateBeatVisualization(); // Use enhanced beat system
            this.pauseBtn.textContent = '⏸';
            this.hideMessage();
        }
    }

    endGame() {
        clearInterval(this.gameTimer);
        clearInterval(this.beatIntervalId); // Old beat system (FIXED VARIABLE NAME)
        clearInterval(this.beatTimer); // Clear beat visualization timer
        this.gameState = 'gameover';
        
        // Calculate average beat accuracy
        const avgBeatAccuracy = this.beatAccuracy.length > 0 ? 
            Math.floor(this.beatAccuracy.reduce((a, b) => a + b, 0) / this.beatAccuracy.length) : 0;
        
        // Update final score display (including musical score)
        this.finalScoreEl.textContent = (this.score + this.musicalScore).toLocaleString();
        this.bestComboEl.textContent = `x${this.bestCombo}`;
        this.longestPatternEl.textContent = this.longestPattern;
        this.totalPatternsEl.textContent = this.totalPatterns;
        
        // Add musical stats if available
        if (this.currentSong) {
            const existingStats = document.querySelector('.stats-container');
            const musicalStat = document.createElement('div');
            musicalStat.className = 'stat';
            musicalStat.innerHTML = `
                <span class="stat-label">Musical Harmony:</span>
                <span class="stat-value">${this.musicalScore}</span>
            `;
            existingStats.appendChild(musicalStat);
            
            const timingStat = document.createElement('div');
            timingStat.className = 'stat';
            timingStat.innerHTML = `
                <span class="stat-label">Beat Accuracy:</span>
                <span class="stat-value">${avgBeatAccuracy}%</span>
            `;
            existingStats.appendChild(timingStat);
        }
        
        setTimeout(() => {
            this.showScreen('gameover');
        }, 1000);
    }

    showMessage(text) {
        const existingMessage = document.querySelector('.game-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const message = document.createElement('div');
        message.className = 'game-message';
        message.textContent = text;
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: 'Fredoka One', cursive;
            font-size: 4rem;
            color: #ffffff;
            text-shadow: 0 0 20px #ff0066;
            z-index: 100;
            pointer-events: none;
        `;
        
        this.screens.game.appendChild(message);
    }

    hideMessage() {
        const message = document.querySelector('.game-message');
        if (message) {
            message.remove();
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PatternHero();
});