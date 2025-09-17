// Global state
let currentRoundIdx = 0;
let currentTopic = '';
let currentTeam = '';
let currentQuestionIdx = 0;
let roundsData = [];
let teams = []; // Make teams globally accessible
let timerInterval = null;

// --- Core Functions ---

async function fetchRoundsData() {
    try {
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error('Failed to fetch questions data');
        const data = await res.json();
        roundsData = data.rounds || [];
        teams = data.teams || ["Alpha", "Bravo", "Charlie", "Delta"];
    } catch (error) {
        console.error("Error fetching rounds data:", error);
        // Fallback data
        roundsData = [];
        teams = ["Alpha", "Bravo", "Charlie", "Delta"];
    }
}

function get_teams() {
    return teams;
}

function getCurrentQuestions() {
    const round = roundsData[currentRoundIdx];
    if (!round) return [];
    
    // For Round 1 (topics)
    if (round.type === 'topic') {
        const topicObj = round.topics.find(t => t.name === currentTopic);
        if (!topicObj) return [];
        // Get team-specific questions if available
        const teamQuestions = topicObj.teamQuestions?.[currentTeam];
        return teamQuestions || topicObj.questions || [];
    } 
    // For Round 2 (multimedia)
    else if (round.type === 'multimedia') {
        // Get team-specific questions if available
        const teamQuestions = round.teamQuestions?.[currentTeam];
        if (teamQuestions) {
            if (currentTopic === 'Audio') {
                return teamQuestions.filter(q => q.audio);
            } else if (currentTopic === 'Image') {
                return teamQuestions.filter(q => q.image);
            }
            return teamQuestions;
        }
        // Fallback to common questions
        if (currentTopic === 'Audio') {
            return (round.questions || []).filter(q => q.audio);
        } else if (currentTopic === 'Image') {
            return (round.questions || []).filter(q => q.image);
        }
        return round.questions || [];
    } 
    // For Round 3 (common)
    else {
        return round.questions || [];
    }
}

function showQuestion() {
    const questions = getCurrentQuestions();
    const area = document.getElementById('question-area');
    area.innerHTML = '';

    // Create containers for question and options
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    
    area.appendChild(questionText);
    area.appendChild(optionsList);

    let timerSpan = document.getElementById('timer');
    if (!timerSpan) {
        timerSpan = document.createElement('span');
        timerSpan.id = 'timer';
        timerSpan.className = 'text-2xl font-bold text-red-600';
        const timerLabel = document.createElement('label');
        timerLabel.textContent = 'Timer';
        timerLabel.className = 'block font-semibold mb-1';
        area.parentNode.insertBefore(timerLabel, area);
        area.parentNode.insertBefore(timerSpan, area);
    }

    if (!questions.length) {
        area.innerHTML = '<div class="text-red-600">No questions available.</div>';
        timerSpan.textContent = '';
        return;
    }

    const q = questions[currentQuestionIdx];
    if (!q) {
        area.innerHTML = '<div class="text-green-600 font-bold">End of questions.</div>';
        timerSpan.textContent = '';
        return;
    }

    const round = roundsData[currentRoundIdx];
    if (round && round.type === 'common') {
        // Round 3 Logic
        const correctAnswer = q.options && typeof q.answer === 'number' ? q.options[q.answer] : q.answer;
        
        let html = `<div class="mb-6 p-6 rounded-xl glass-effect">
            <div class="mb-4 text-2xl font-bold text-white">Q${currentQuestionIdx + 1}: ${q.question}</div>
            <div class="answer-section mb-4" style="display: none;">
                <div class="text-xl font-bold text-green-400 mb-2">Answer:</div>
                <div class="text-white text-lg">${correctAnswer || 'No answer provided'}</div>
            </div>
            <button id="show-answer-btn" class="bg-blue-500/40 hover:bg-blue-500/60 px-4 py-2 rounded-lg font-bold text-white backdrop-blur border border-blue-400/30 mb-4">Show Answer</button>`;

        if (q.options) {
            html += '<div class="flex flex-col gap-2 mb-2">';
            q.options.forEach(opt => {
                html += `<div class="option-container text-lg">${opt}</div>`;
            });
            html += '</div>';
        }

        html += '<div class="flex flex-col gap-4 mt-4">';
        get_teams().forEach(team => {
            html += `
                <div class="flex gap-4 items-center">
                    <button class="team-answer-btn bg-green-500/40 hover:bg-green-500/60 px-4 py-2 rounded-lg font-bold w-32 text-white backdrop-blur border border-green-400/30" data-team="${team}" data-points="50">${team} (+50)</button>
                    <button class="team-answer-btn bg-red-500/40 hover:bg-red-500/60 px-4 py-2 rounded-lg font-bold w-32 text-white backdrop-blur border border-red-400/30" data-team="${team}" data-points="-20">${team} (-20)</button>
                </div>
            `;
        });
        html += '</div>';
        html += `<div class="team-answer-feedback mt-4 text-blue-200 font-bold" id="feedback-${currentQuestionIdx}"></div></div>`;
        area.innerHTML = html;

        // Add event listener for show answer button
        const showAnswerBtn = area.querySelector('#show-answer-btn');
        if (showAnswerBtn) {
            showAnswerBtn.addEventListener('click', function() {
                const answerSection = area.querySelector('.answer-section');
                if (answerSection) {
                    if (answerSection.style.display === 'none') {
                        answerSection.style.display = 'block';
                        this.textContent = 'Hide Answer';
                        this.classList.add('bg-gray-500/40', 'hover:bg-gray-500/60');
                        this.classList.remove('bg-blue-500/40', 'hover:bg-blue-500/60');
                    } else {
                        answerSection.style.display = 'none';
                        this.textContent = 'Show Answer';
                        this.classList.add('bg-blue-500/40', 'hover:bg-blue-500/60');
                        this.classList.remove('bg-gray-500/40', 'hover:bg-gray-500/60');
                    }
                }
            });
        }

        area.querySelectorAll('.team-answer-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const team = this.getAttribute('data-team');
                const points = parseInt(this.getAttribute('data-points'));
                // Disable only the buttons for this team
                area.querySelectorAll(`.team-answer-btn[data-team="${team}"]`).forEach(b => b.disabled = true);
                
                await fetch('/api/scores', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({team: team, points: points})
                });
                document.getElementById(`feedback-${currentQuestionIdx}`).textContent = 
                    `${points >= 0 ? '+' : ''}${points} points awarded to ${team}`;
                updateTeamScoresBox();
            });
        });
    } else {
        // Round 1 & 2 Logic
        let html = `<div class="mb-4 text-3xl font-bold">${q.question}</div>`;
        if (q.image) {
            html += `<img src="/${q.image}" alt="Question Image" class="w-full max-w-xs mb-4 rounded shadow">`;
        }
        if (q.audio) {
            html += `<audio controls class="mb-4 w-full"><source src="/${q.audio}" type="audio/mpeg">Your browser does not support audio.</audio>`;
        }

        const round = roundsData[currentRoundIdx];
        const isMultimedia = round && round.type === 'multimedia' && (q.audio || q.image);

        if (isMultimedia) {
            // Replace options with Right/Wrong buttons for multimedia questions only
            html += '<div class="flex gap-3 mt-2">'
                + '<button id="btn-right" class="bg-green-500/80 hover:bg-green-600/90 text-white px-6 py-3 rounded font-semibold">Right</button>'
                + '<button id="btn-wrong" class="bg-red-500/80 hover:bg-red-600/90 text-white px-6 py-3 rounded font-semibold">Wrong</button>'
                + '</div>';
            area.innerHTML = html;

            const rightBtn = document.getElementById('btn-right');
            const wrongBtn = document.getElementById('btn-wrong');
            const teamName = getCurrentTeamName();
            const gainPoints = 50;
            const losePoints = -20;

            const finishAndScore = async (points, message) => {
                if (timerInterval) clearInterval(timerInterval);
                rightBtn.disabled = true;
                wrongBtn.disabled = true;
                let feedback = document.createElement('div');
                feedback.className = 'mt-4 text-xl font-bold';
                feedback.textContent = message;
                area.appendChild(feedback);
                if (teamName) {
                    await fetch('/api/scores', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({team: teamName, points})
                    });
                    updateTeamScoresBox();
                }
            };

            rightBtn.addEventListener('click', async () => {
                await finishAndScore(gainPoints, `Correct! (+${gainPoints} points)`);
            });
            wrongBtn.addEventListener('click', async () => {
                await finishAndScore(losePoints, `Incorrect. (${losePoints} points)`);
            });
        } else {
            // Default behavior (multiple-choice or input)
            if (q.options) {
                html += '<div class="flex flex-col gap-2">';
                q.options.forEach((opt, idx) => {
                    html += `<div class="option-container"><button class="option-btn text-white px-6 py-3 rounded text-lg font-semibold w-full text-left" data-idx="${idx}">${opt}</button></div>`;
                });
                html += '</div>';
            } else {
                html += '<input type="text" class="border rounded px-2 py-1 w-full" placeholder="Type your answer">';
            }
            area.innerHTML = html;

            if (q.options) {
                const btns = area.querySelectorAll('.option-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', async function() {
                        if (timerInterval) clearInterval(timerInterval);
                        const selectedIdx = parseInt(btn.getAttribute('data-idx'));
                        btns.forEach(b => b.disabled = true);
                        let correct = selectedIdx === q.answer;
                        if (correct) {
                            btn.classList.add('bg-green-300');
                            btn.classList.remove('bg-gray-100');
                        } else {
                            btn.classList.add('bg-red-300');
                            btn.classList.remove('bg-gray-100');
                            btns[q.answer].classList.add('bg-green-300');
                        }
                        // Show feedback
                        let feedback = document.createElement('div');
                        feedback.className = 'mt-4 text-xl font-bold';
                        feedback.textContent = correct ? 'Correct! (+50 points)' : 
                            `Incorrect. (-20 points). Correct answer: ${q.options[q.answer]}`;
                        area.appendChild(feedback);
                        // Update score for current team
                        const teamName2 = getCurrentTeamName();
                        if (teamName2) {
                            await fetch('/api/scores', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({team: teamName2, points: correct ? 50 : -20})
                            });
                            updateTeamScoresBox();
                        }
                    });
                });
            }
        }
    }

    // Timer logic for all rounds
    if (timerInterval) clearInterval(timerInterval);
    let seconds = q.timer || 30;
    timerSpan.textContent = formatTime(seconds);
    timerInterval = setInterval(() => {
        seconds--;
        timerSpan.textContent = formatTime(seconds);
        if (seconds <= 0) {
            clearInterval(timerInterval);
            timerSpan.textContent = 'Time Up!';
            area.querySelectorAll('button').forEach(b => b.disabled = true);
        }
    }, 1000);
}

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getCurrentTeamName() {
    return currentTeam;
}

function updateSelection() {
    const teamSelect = document.getElementById('team-select');
    const roundSelect = document.getElementById('round-select');
    const topicSelect = document.getElementById('topic-select');
    currentRoundIdx = parseInt(roundSelect.value);
    currentTopic = topicSelect.value;
    currentTeam = teamSelect.value;
    currentQuestionIdx = 0;
}

// Fetch rounds, topics, and teams for dropdowns
async function loadRoundsAndTopics() {
    const teamSelect = document.getElementById('team-select');
    const roundSelect = document.getElementById('round-select');
    const topicSelect = document.getElementById('topic-select');
    teamSelect.innerHTML = '';
    roundSelect.innerHTML = '';
    topicSelect.innerHTML = '';
    
    try {
        const resQ = await fetch('/api/questions');
        const dataQ = await resQ.json();
        teams = dataQ.teams || ["Alpha", "Bravo", "Charlie", "Delta"];
        teams.forEach(team => {
            const opt = document.createElement('option');
            opt.value = team;
            opt.textContent = team;
            teamSelect.appendChild(opt);
        });
    } catch (e) {
        console.error('Error loading teams:', e);
        ["Alpha", "Bravo", "Charlie", "Delta"].forEach(team => {
            const opt = document.createElement('option');
            opt.value = team;
            opt.textContent = team;
            teamSelect.appendChild(opt);
        });
    }

    try {
        const res = await fetch('/api/rounds');
        const rounds = await res.json();
        rounds.forEach((rnd, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = rnd.name;
            roundSelect.appendChild(opt);
        });
        
        // Load topics for first round by default
        if (rounds.length > 0) {
            if (rounds[0].topics) {
                rounds[0].topics.forEach(topic => {
                    const opt = document.createElement('option');
                    opt.value = topic;
                    opt.textContent = topic;
                    topicSelect.appendChild(opt);
                });
            } else if (rounds[0].type === 'multimedia') {
                ['Audio', 'Image'].forEach(topic => {
                    const opt = document.createElement('option');
                    opt.value = topic;
                    opt.textContent = topic;
                    topicSelect.appendChild(opt);
                });
            }
        }

        // Change topics when round changes
        roundSelect.addEventListener('change', function() {
            const idx = parseInt(roundSelect.value);
            topicSelect.innerHTML = '';
            if (rounds[idx].topics) {
                rounds[idx].topics.forEach(topic => {
                    const opt = document.createElement('option');
                    opt.value = topic;
                    opt.textContent = topic;
                    topicSelect.appendChild(opt);
                });
            } else if (rounds[idx].type === 'multimedia') {
                ['Audio', 'Image'].forEach(topic => {
                    const opt = document.createElement('option');
                    opt.value = topic;
                    opt.textContent = topic;
                    topicSelect.appendChild(opt);
                });
            }
        });
    } catch (e) {
        console.error('Error loading rounds:', e);
    }
}

async function updateTeamScoresBox() {
    const scoresBox = document.getElementById('team-scores');
    scoresBox.innerHTML = '';
    
    try {
        const res = await fetch('/api/scores');
        const scores = await res.json();
        
        // Always show all teams
        get_teams().forEach(team => {
            const score = scores[team] || 0;
            const card = document.createElement('div');
            card.className = 'bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl shadow-lg p-4 flex flex-col items-center w-48 pointer-events-none';
            card.innerHTML = `<div class="text-xl font-bold text-blue-900 mb-2">${team}</div><div class="text-4xl font-extrabold text-blue-700">${score}</div>`;
            scoresBox.appendChild(card);
        });
    } catch (e) {
        console.error('Error updating scores:', e);
        get_teams().forEach(team => {
            const card = document.createElement('div');
            card.className = 'bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl shadow-lg p-4 flex flex-col items-center w-48 pointer-events-none';
            card.innerHTML = `<div class="text-xl font-bold text-blue-900 mb-2">${team}</div><div class="text-4xl font-extrabold text-blue-700">0</div>`;
            scoresBox.appendChild(card);
        });
    }
}

// Event Listeners
document.getElementById('show-question').addEventListener('click', async function() {
    await fetchRoundsData();
    updateSelection();
    showQuestion();
    updateTeamScoresBox();
});

document.getElementById('next-question').addEventListener('click', function() {
    const questions = getCurrentQuestions();
    if (currentQuestionIdx < questions.length - 1) {
        currentQuestionIdx++;
        showQuestion();
    } else {
        alert('End of questions for this round/topic.');
    }
});

document.getElementById('prev-question').addEventListener('click', function() {
    if (currentQuestionIdx > 0) {
        currentQuestionIdx--;
        showQuestion();
    } else {
        alert('This is the first question.');
    }
});

document.getElementById('reset-scores').addEventListener('click', async function() {
    const resetBtn = this;
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';

    try {
        const response = await fetch('/api/reset_scores', { method: 'POST' });
        const result = await response.json();

        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Server responded with an error.');
        }

        console.log('Scores reset successfully. Updating UI.');
        await updateTeamScoresBox();

    } catch (error) {
        console.error('Failed to reset scores:', error);
        alert('An error occurred while resetting scores. Please check the console and try again.');
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Reset Scores';
    }
});

window.addEventListener('DOMContentLoaded', async function() {
    await loadRoundsAndTopics();
    const teamSelect = document.getElementById('team-select');
    teamSelect.addEventListener('change', function() {
        currentTeam = teamSelect.value;
        updateTeamScoresBox();
    });
    await updateTeamScoresBox();
    setInterval(updateTeamScoresBox, 2000);
});