/**
 * Advanced Pattern Recognition & Musical AI Engine
 * Learns user patterns, tracks rhythm, and builds musical intelligence
 */

class PatternAIEngine {
    constructor(musicalEngine) {
        this.musicalEngine = musicalEngine;
        this.isInitialized = false;
        
        // Pattern Recognition
        this.keystrokeHistory = []; // Raw keystroke data with timing
        this.detectedPatterns = new Map(); // Pattern -> frequency/score
        this.hierarchicalPatterns = new Map(); // Nested patterns
        this.learnedPatterns = []; // User's signature patterns
        
        // Musical Timing
        this.currentBeat = 0;
        this.beatHistory = [];
        this.tempoHistory = [];
        this.rhythmPatterns = new Map();
        
        // AI Learning
        this.userStyle = {
            preferredPatterns: [],
            averageTempo: 120,
            rhythmPreference: 'quarter', // quarter, eighth, sixteenth
            patternComplexity: 'medium',
            musicalScale: 'pentatonic'
        };
        
        // Pattern Analysis Settings
        this.maxPatternLength = 64; // Up to 16 bars (4 beats/bar * 16 = 64 quarter notes)
        this.minPatternLength = 2;
        this.patternScoreThreshold = 1.5; // Lower threshold for more responsive detection
        
        // Musical Note Values (in milliseconds at 120 BPM)
        this.noteValues = {
            whole: 2000,      // 2 seconds
            half: 1000,       // 1 second  
            quarter: 500,     // 0.5 seconds
            eighth: 250,      // 0.25 seconds
            sixteenth: 125,   // 0.125 seconds
            thirtysecond: 62.5 // 0.0625 seconds
        };
    }

    initialize() {
        this.isInitialized = true;
        this.loadUserPatterns();
        console.log('Pattern AI Engine initialized');
    }

    // Record every keystroke with precise timing
    recordKeystroke(char, timestamp, musicalNote) {
        const keystroke = {
            char: char.toLowerCase(),
            timestamp: timestamp,
            musicalNote: musicalNote,
            timeSinceLastKey: this.keystrokeHistory.length > 0 ? 
                timestamp - this.keystrokeHistory[this.keystrokeHistory.length - 1].timestamp : 0,
            beatPosition: this.musicalEngine ? this.musicalEngine.getCurrentBeatPosition() : 0
        };
        
        this.keystrokeHistory.push(keystroke);
        
        // Keep only last 1000 keystrokes for performance
        if (this.keystrokeHistory.length > 1000) {
            this.keystrokeHistory.shift();
        }
        
        // Real-time pattern analysis (only analyze if we have enough data)
        if (this.keystrokeHistory.length >= this.minPatternLength) {
            try {
                this.analyzePatterns();
                this.analyzeRhythm();
                this.updateUserStyle();
            } catch (error) {
                console.error('Pattern analysis error:', error);
            }
        }
        
        return this.getPatternSuggestions();
    }

    // Advanced hierarchical pattern recognition
    analyzePatterns() {
        if (this.keystrokeHistory.length < this.minPatternLength) return;
        
        const recentKeystrokes = this.keystrokeHistory.slice(-32); // Analyze last 32 keystrokes
        const charSequence = recentKeystrokes.map(k => k.char).join('');
        
        // Find all possible pattern lengths (2 to maxPatternLength)
        for (let patternLength = this.minPatternLength; patternLength <= Math.min(this.maxPatternLength, recentKeystrokes.length / 2); patternLength++) {
            this.findPatternsOfLength(charSequence, patternLength, recentKeystrokes);
        }
        
        // Find nested patterns (patterns within patterns)
        this.findNestedPatterns();
        
        // Score and rank patterns
        this.scoreAndRankPatterns();
    }

    findPatternsOfLength(sequence, patternLength, keystrokeData) {
        const patterns = new Map();
        
        // Sliding window to find repeating patterns
        for (let i = 0; i <= sequence.length - patternLength * 2; i++) {
            const pattern = sequence.substring(i, i + patternLength);
            
            // 🚫 SPAM DETECTION: Skip low-quality patterns
            if (this.isSpamPattern(pattern)) {
                continue; // Don't even consider spam patterns
            }
            
            // Look for repetitions of this pattern
            let repetitions = 1;
            let nextStart = i + patternLength;
            
            while (nextStart <= sequence.length - patternLength) {
                const nextPattern = sequence.substring(nextStart, nextStart + patternLength);
                if (nextPattern === pattern) {
                    repetitions++;
                    nextStart += patternLength;
                } else {
                    break;
                }
            }
            
            // Only consider patterns that repeat at least twice AND have quality
            if (repetitions >= 2) {
                const qualityScore = this.calculatePatternQuality(pattern);
                if (qualityScore < 0.3) continue; // Skip low-quality patterns
                
                const patternKey = `${pattern}_${patternLength}`;
                const existingPattern = this.detectedPatterns.get(patternKey) || {
                    pattern: pattern,
                    length: patternLength,
                    frequency: 0,
                    score: 0,
                    lastSeen: 0,
                    rhythmInfo: null,
                    qualityScore: qualityScore,
                    firstSeen: Date.now()
                };
                
                existingPattern.frequency += repetitions;
                existingPattern.lastSeen = Date.now();
                existingPattern.score = this.calculatePatternScore(existingPattern, repetitions);
                
                // Add rhythm information
                if (keystrokeData) {
                    existingPattern.rhythmInfo = this.analyzePatternRhythm(pattern, keystrokeData);
                }
                
                // Apply freshness penalty for overused patterns
                const freshnessPenalty = this.calculateFreshnessPenalty(existingPattern);
                existingPattern.score *= freshnessPenalty;
                
                // Only store patterns with decent scores after all penalties
                if (existingPattern.score > 1.0) {
                    this.detectedPatterns.set(patternKey, existingPattern);
                    patterns.set(pattern, existingPattern);
                }
            }
        }
        
        return patterns;
    }

    findNestedPatterns() {
        const allPatterns = Array.from(this.detectedPatterns.values())
            .filter(p => p.score > this.patternScoreThreshold)
            .sort((a, b) => b.length - a.length); // Start with longest patterns
        
        for (let i = 0; i < allPatterns.length; i++) {
            const parentPattern = allPatterns[i];
            
            for (let j = i + 1; j < allPatterns.length; j++) {
                const childPattern = allPatterns[j];
                
                // Check if child pattern is contained within parent pattern
                if (parentPattern.pattern.includes(childPattern.pattern)) {
                    const nestedKey = `${parentPattern.pattern}_contains_${childPattern.pattern}`;
                    
                    this.hierarchicalPatterns.set(nestedKey, {
                        parent: parentPattern,
                        child: childPattern,
                        nestingScore: parentPattern.score * childPattern.score,
                        relationship: 'contains'
                    });
                }
            }
        }
    }

    calculatePatternScore(pattern, repetitions) {
        const baseScore = repetitions * pattern.length;
        const complexityBonus = Math.min(pattern.length / 4, 5); // Bonus for longer patterns
        const uniqueCharsBonus = new Set(pattern.pattern).size * 0.5; // Bonus for variety
        const recencyBonus = Math.max(0, 5 - (Date.now() - pattern.lastSeen) / 1000); // Recent patterns get bonus
        
        return baseScore + complexityBonus + uniqueCharsBonus + recencyBonus;
    }

    scoreAndRankPatterns() {
        // Clean up old patterns (remove patterns not seen in last 30 seconds)
        const cutoffTime = Date.now() - 30000;
        
        for (const [key, pattern] of this.detectedPatterns.entries()) {
            if (pattern.lastSeen < cutoffTime && pattern.frequency < 3) {
                this.detectedPatterns.delete(key);
            }
        }
        
        // Update scores for remaining patterns
        for (const [key, pattern] of this.detectedPatterns.entries()) {
            // Decay score over time for patterns not recently seen
            const timeSinceLastSeen = Date.now() - pattern.lastSeen;
            const decayFactor = Math.max(0.1, 1 - (timeSinceLastSeen / 60000)); // Decay over 1 minute
            pattern.score = pattern.score * decayFactor;
        }
        
        // Identify top patterns for learning
        const topPatterns = Array.from(this.detectedPatterns.values())
            .filter(p => p.score > this.patternScoreThreshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        // Add to learned patterns if they're new and significant
        topPatterns.forEach(pattern => {
            const isLearned = this.learnedPatterns.some(learned => 
                learned.pattern === pattern.pattern
            );
            
            if (!isLearned && pattern.score > this.patternScoreThreshold * 2) {
                this.learnedPatterns.push({
                    pattern: pattern.pattern,
                    learnedAt: Date.now(),
                    strength: pattern.score,
                    category: this.categorizePattern(pattern)
                });
                
                // Keep only the best 50 learned patterns
                this.learnedPatterns.sort((a, b) => b.strength - a.strength);
                if (this.learnedPatterns.length > 50) {
                    this.learnedPatterns = this.learnedPatterns.slice(0, 50);
                }
            }
        });
    }

    categorizePattern(pattern) {
        // Categorize patterns for better suggestions
        if (pattern.length <= 3) return 'simple';
        if (pattern.length >= 8) return 'complex';
        
        // Check for repetitive structures
        const isRepeating = pattern.pattern.length > 2 && 
            pattern.pattern === pattern.pattern.substring(0, pattern.pattern.length / 2).repeat(2);
        
        if (isRepeating) return 'repetitive';
        
        // Check for alternating patterns
        const chars = pattern.pattern.split('');
        const isAlternating = chars.length > 2 && 
            chars.every((char, i) => i < 2 || char === chars[i % 2]);
        
        if (isAlternating) return 'alternating';
        
        return 'varied';
    }

    // 🚫 SPAM DETECTION: Identify low-quality patterns
    isSpamPattern(pattern) {
        // Single character repeated (like "mmmmm")
        if (pattern.length > 2) {
            const firstChar = pattern[0];
            if (pattern.split('').every(char => char === firstChar)) {
                return true; // Pure spam: same character repeated
            }
        }
        
        // Two character alternation spam (like "ababab")  
        if (pattern.length > 4) {
            const isSimpleAlternation = pattern.length % 2 === 0 && 
                pattern === pattern.substring(0, 2).repeat(pattern.length / 2);
            if (isSimpleAlternation && new Set(pattern).size <= 2) {
                return true; // Simple alternation spam
            }
        }
        
        // Check for excessive character repetition (>60% same character)
        const charCounts = {};
        for (const char of pattern) {
            charCounts[char] = (charCounts[char] || 0) + 1;
        }
        const maxCharFreq = Math.max(...Object.values(charCounts));
        if (maxCharFreq / pattern.length > 0.6) {
            return true; // Too much repetition of single character
        }
        
        return false; // Pattern passes spam detection
    }

    // 🎯 PATTERN QUALITY: Score pattern diversity and musicality
    calculatePatternQuality(pattern) {
        let quality = 1.0;
        
        // Diversity bonus: reward using different characters
        const uniqueChars = new Set(pattern).size;
        const diversityRatio = uniqueChars / pattern.length;
        quality *= (0.5 + diversityRatio); // 0.5 to 1.5 multiplier
        
        // Length sweet spot: prefer 3-8 character patterns
        if (pattern.length >= 3 && pattern.length <= 8) {
            quality *= 1.2; // 20% bonus for good length
        } else if (pattern.length > 12) {
            quality *= 0.7; // Penalty for very long patterns
        }
        
        // Musical coherence: reward patterns that use keys close to each other
        // (simulates finger patterns on keyboard)
        if (this.hasMusicalCoherence(pattern)) {
            quality *= 1.3; // 30% bonus for musical patterns
        }
        
        // Penalize excessive repetition within the pattern
        const hasInternalRepetition = this.hasExcessiveInternalRepetition(pattern);
        if (hasInternalRepetition) {
            quality *= 0.6; // 40% penalty for internal repetition
        }
        
        return Math.max(0.1, Math.min(2.0, quality)); // Clamp between 0.1 and 2.0
    }

    // 🎵 Check if pattern has musical coherence (keys close together)
    hasMusicalCoherence(pattern) {
        const keyboardRows = {
            'qwertyuiop': 0,
            'asdfghjkl': 1, 
            'zxcvbnm': 2
        };
        
        let rowPositions = [];
        for (const char of pattern) {
            for (const [row, rowIndex] of Object.entries(keyboardRows)) {
                if (row.includes(char)) {
                    rowPositions.push(rowIndex);
                    break;
                }
            }
        }
        
        // Musical patterns tend to stay within 2 keyboard rows
        const uniqueRows = new Set(rowPositions).size;
        return uniqueRows <= 2;
    }

    // 🔍 Detect excessive internal repetition
    hasExcessiveInternalRepetition(pattern) {
        if (pattern.length <= 4) return false;
        
        // Check if pattern is just a short sequence repeated
        for (let subLen = 2; subLen <= pattern.length / 2; subLen++) {
            const substr = pattern.substring(0, subLen);
            if (pattern === substr.repeat(Math.floor(pattern.length / subLen)) + 
                         pattern.substring(0, pattern.length % subLen)) {
                return true; // Pattern is just repetition of shorter pattern
            }
        }
        
        return false;
    }

    // ⏰ FRESHNESS PENALTY: Reduce score for overused patterns
    calculateFreshnessPenalty(patternData) {
        const timeSinceFirstSeen = Date.now() - (patternData.firstSeen || Date.now());
        const usageRate = patternData.frequency / Math.max(1, timeSinceFirstSeen / 1000); // uses per second
        
        // If pattern is being used more than 2 times per second, apply heavy penalty
        if (usageRate > 2) {
            return 0.1; // 90% penalty for spam usage
        } else if (usageRate > 1) {
            return 0.3; // 70% penalty for frequent usage
        } else if (usageRate > 0.5) {
            return 0.7; // 30% penalty for somewhat frequent usage
        }
        
        return 1.0; // No penalty for fresh patterns
    }

    // 🥁 RHYTHM SPAM DETECTION: Identify key-mashing and spam rhythms
    isRhythmSpam(keystrokes) {
        if (keystrokes.length < 4) return false;
        
        // Check for single key spam (same key repeated rapidly)
        const chars = keystrokes.map(k => k.char);
        const uniqueChars = new Set(chars);
        if (uniqueChars.size === 1 && keystrokes.length > 3) {
            // Check if intervals are very short (indicating key holding)
            const intervals = [];
            for (let i = 1; i < keystrokes.length; i++) {
                intervals.push(keystrokes[i].timestamp - keystrokes[i-1].timestamp);
            }
            const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
            if (avgInterval < 50) { // Less than 50ms between keys = key holding
                return true;
            }
        }
        
        // Check for excessive 32nd notes (typically indicates key-mashing)
        let fast32ndCount = 0;
        for (let i = 1; i < keystrokes.length; i++) {
            const interval = keystrokes[i].timestamp - keystrokes[i-1].timestamp;
            if (interval < 80) { // Very fast typing (32nd notes at high tempo)
                fast32ndCount++;
            }
        }
        
        // If more than 70% of intervals are 32nd notes, it's probably spam
        if (fast32ndCount / (keystrokes.length - 1) > 0.7) {
            return true;
        }
        
        return false;
    }

    analyzeRhythm() {
        if (this.keystrokeHistory.length < 4) return;
        
        const recentStrokes = this.keystrokeHistory.slice(-16); // Analyze last 16 keystrokes
        
        // 🚫 RHYTHM SPAM DETECTION: Check for key-mashing patterns
        if (this.isRhythmSpam(recentStrokes)) {
            return; // Don't analyze spam rhythms
        }
        
        const intervals = [];
        
        // Calculate time intervals between keystrokes
        for (let i = 1; i < recentStrokes.length; i++) {
            const interval = recentStrokes[i].timestamp - recentStrokes[i-1].timestamp;
            intervals.push(interval);
        }
        
        // Classify intervals into musical note values
        const rhythmPattern = intervals.map(interval => this.classifyInterval(interval));
        const rhythmKey = rhythmPattern.join('-');
        
        // Track rhythm patterns
        const existingRhythm = this.rhythmPatterns.get(rhythmKey) || {
            pattern: rhythmPattern,
            frequency: 0,
            averageInterval: 0,
            lastSeen: 0
        };
        
        existingRhythm.frequency++;
        existingRhythm.averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        existingRhythm.lastSeen = Date.now();
        
        this.rhythmPatterns.set(rhythmKey, existingRhythm);
        
        // Update tempo estimation
        this.updateTempoEstimation(intervals);
    }

    classifyInterval(intervalMs) {
        // Classify time interval into musical note value
        const currentTempo = this.userStyle.averageTempo;
        const quarterNoteMs = (60 / currentTempo) * 1000;
        
        const ratios = {
            'whole': intervalMs / (quarterNoteMs * 4),
            'half': intervalMs / (quarterNoteMs * 2),
            'quarter': intervalMs / quarterNoteMs,
            'eighth': intervalMs / (quarterNoteMs / 2),
            'sixteenth': intervalMs / (quarterNoteMs / 4),
            'thirtysecond': intervalMs / (quarterNoteMs / 8)
        };
        
        // Find closest match
        let closestNote = 'quarter';
        let closestDistance = Math.abs(ratios.quarter - 1);
        
        for (const [note, ratio] of Object.entries(ratios)) {
            const distance = Math.abs(ratio - 1);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        }
        
        // If the interval is very long, consider it a rest
        if (intervalMs > quarterNoteMs * 2) {
            return 'rest';
        }
        
        return closestNote;
    }

    updateTempoEstimation(intervals) {
        // Estimate tempo based on recent intervals
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const estimatedTempo = 60000 / (avgInterval * 4); // Assuming quarter note base
        
        this.tempoHistory.push(estimatedTempo);
        
        // Keep only last 20 tempo estimates
        if (this.tempoHistory.length > 20) {
            this.tempoHistory.shift();
        }
        
        // Update user's average tempo
        this.userStyle.averageTempo = this.tempoHistory.reduce((a, b) => a + b, 0) / this.tempoHistory.length;
    }

    updateUserStyle() {
        // Analyze user's preferred patterns
        const topPatterns = Array.from(this.detectedPatterns.values())
            .filter(p => p.score > this.patternScoreThreshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        this.userStyle.preferredPatterns = topPatterns;
        
        // Determine complexity preference
        const avgPatternLength = topPatterns.reduce((sum, p) => sum + p.length, 0) / topPatterns.length;
        if (avgPatternLength < 3) {
            this.userStyle.patternComplexity = 'simple';
        } else if (avgPatternLength > 6) {
            this.userStyle.patternComplexity = 'complex';
        } else {
            this.userStyle.patternComplexity = 'medium';
        }
        
        // Analyze rhythm preference
        const rhythmCounts = {};
        Array.from(this.rhythmPatterns.values()).forEach(rhythm => {
            rhythm.pattern.forEach(note => {
                rhythmCounts[note] = (rhythmCounts[note] || 0) + 1;
            });
        });
        
        const mostCommonRhythm = Object.entries(rhythmCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (mostCommonRhythm) {
            this.userStyle.rhythmPreference = mostCommonRhythm[0];
        }
    }

    getPatternSuggestions() {
        const suggestions = [];
        
        // Suggest variations of user's favorite patterns
        const topPatterns = this.userStyle.preferredPatterns.slice(0, 3);
        
        topPatterns.forEach(pattern => {
            // Suggest extending the pattern
            suggestions.push({
                type: 'extend',
                original: pattern.pattern,
                suggestion: pattern.pattern + pattern.pattern,
                confidence: pattern.score / 100,
                description: `Try extending "${pattern.pattern}" to make it longer`
            });
            
            // Suggest variations
            const variation = this.generatePatternVariation(pattern.pattern);
            if (variation !== pattern.pattern) {
                suggestions.push({
                    type: 'variation',
                    original: pattern.pattern,
                    suggestion: variation,
                    confidence: pattern.score / 100,
                    description: `Try this variation: "${variation}"`
                });
            }
        });
        
        // Suggest rhythmic variations
        if (this.rhythmPatterns.size > 0) {
            const topRhythm = Array.from(this.rhythmPatterns.values())
                .sort((a, b) => b.frequency - a.frequency)[0];
            
            suggestions.push({
                type: 'rhythm',
                original: topRhythm.pattern.join('-'),
                suggestion: this.generateRhythmVariation(topRhythm.pattern),
                confidence: 0.8,
                description: 'Try varying your rhythm pattern'
            });
        }
        
        return suggestions.slice(0, 5); // Return top 5 suggestions
    }

    generatePatternVariation(pattern) {
        // Simple pattern variation strategies
        const strategies = [
            // Reverse the pattern
            () => pattern.split('').reverse().join(''),
            // Double the pattern
            () => pattern + pattern,
            // Add a character at the end
            () => pattern + this.getRandomCharFromUserHistory(),
            // Substitute one character
            () => {
                const chars = pattern.split('');
                if (chars.length > 1) {
                    const randomIndex = Math.floor(Math.random() * chars.length);
                    chars[randomIndex] = this.getRandomCharFromUserHistory();
                    return chars.join('');
                }
                return pattern;
            }
        ];
        
        const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
        return randomStrategy();
    }

    generateRhythmVariation(rhythmPattern) {
        // Create rhythm variations
        const variations = [
            // Speed up (add more subdivisions)
            rhythmPattern.map(note => {
                if (note === 'quarter') return 'eighth';
                if (note === 'eighth') return 'sixteenth';
                return note;
            }),
            // Slow down
            rhythmPattern.map(note => {
                if (note === 'sixteenth') return 'eighth';
                if (note === 'eighth') return 'quarter';
                return note;
            }),
            // Add syncopation (add rests)
            rhythmPattern.flatMap((note, i) => i % 2 === 0 ? [note, 'rest'] : [note])
        ];
        
        return variations[Math.floor(Math.random() * variations.length)].join('-');
    }

    getRandomCharFromUserHistory() {
        if (this.keystrokeHistory.length === 0) return 'a';
        
        const recentChars = this.keystrokeHistory.slice(-20).map(k => k.char);
        return recentChars[Math.floor(Math.random() * recentChars.length)];
    }

    analyzePatternRhythm(pattern, keystrokeData) {
        // Analyze the rhythm of a specific pattern within the keystroke data
        const patternOccurrences = this.findPatternOccurrences(pattern, keystrokeData);
        
        if (patternOccurrences.length === 0) return null;
        
        const rhythms = patternOccurrences.map(occurrence => {
            const intervals = [];
            for (let i = 1; i < occurrence.length; i++) {
                intervals.push(occurrence[i].timestamp - occurrence[i-1].timestamp);
            }
            return intervals.map(interval => this.classifyInterval(interval));
        });
        
        // Find the most common rhythm for this pattern
        const rhythmCounts = new Map();
        rhythms.forEach(rhythm => {
            const rhythmKey = rhythm.join('-');
            rhythmCounts.set(rhythmKey, (rhythmCounts.get(rhythmKey) || 0) + 1);
        });
        
        const mostCommonRhythm = Array.from(rhythmCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];
        
        return {
            rhythm: mostCommonRhythm ? mostCommonRhythm[0].split('-') : [],
            confidence: mostCommonRhythm ? mostCommonRhythm[1] / rhythms.length : 0
        };
    }

    findPatternOccurrences(pattern, keystrokeData) {
        const occurrences = [];
        const charSequence = keystrokeData.map(k => k.char).join('');
        
        let startIndex = 0;
        while (startIndex <= charSequence.length - pattern.length) {
            const foundIndex = charSequence.indexOf(pattern, startIndex);
            if (foundIndex === -1) break;
            
            occurrences.push(keystrokeData.slice(foundIndex, foundIndex + pattern.length));
            startIndex = foundIndex + 1;
        }
        
        return occurrences;
    }

    // Save user's learned patterns to localStorage
    saveUserPatterns() {
        const userData = {
            detectedPatterns: Array.from(this.detectedPatterns.entries()),
            hierarchicalPatterns: Array.from(this.hierarchicalPatterns.entries()),
            rhythmPatterns: Array.from(this.rhythmPatterns.entries()),
            userStyle: this.userStyle,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('krackel_user_patterns', JSON.stringify(userData));
    }

    // Load user's learned patterns from localStorage
    loadUserPatterns() {
        const savedData = localStorage.getItem('krackel_user_patterns');
        if (!savedData) return;
        
        try {
            const userData = JSON.parse(savedData);
            
            this.detectedPatterns = new Map(userData.detectedPatterns || []);
            this.hierarchicalPatterns = new Map(userData.hierarchicalPatterns || []);
            this.rhythmPatterns = new Map(userData.rhythmPatterns || []);
            this.userStyle = userData.userStyle || this.userStyle;
            
            console.log('Loaded user patterns:', this.detectedPatterns.size, 'patterns');
        } catch (error) {
            console.error('Failed to load user patterns:', error);
        }
    }

    // Get current analysis for UI display
    getCurrentAnalysis() {
        return {
            detectedPatterns: Array.from(this.detectedPatterns.values())
                .filter(p => p.score > this.patternScoreThreshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10),
            hierarchicalPatterns: Array.from(this.hierarchicalPatterns.values())
                .sort((a, b) => b.nestingScore - a.nestingScore)
                .slice(0, 5),
            rhythmPatterns: Array.from(this.rhythmPatterns.values())
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5),
            userStyle: this.userStyle,
            suggestions: this.getPatternSuggestions(),
            stats: {
                totalKeystrokes: this.keystrokeHistory.length,
                patternsLearned: this.detectedPatterns.size,
                currentTempo: Math.round(this.userStyle.averageTempo)
            }
        };
    }
}

// Export for use in main game
window.PatternAIEngine = PatternAIEngine;
