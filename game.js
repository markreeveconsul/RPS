// Rock Papers Rumble. No build step or dependencies required.
const $ = id => document.getElementById(id);
const moves = ['rock', 'paper', 'scissors'];
const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const phrases = { rock: 'Rock crushes scissors', paper: 'Paper covers rock', scissors: 'Scissors cut paper' };
const buttons = [...document.querySelectorAll('.choice')];
const stage = document.querySelector('.stage');
const arena = document.querySelector('.arena');
let hp = { player: 100, computer: 100 };
const matchWins = { player: 0, computer: 0 };
let round = 1, busy = false, finished = false, generation = 0;
let sound = false, audio;
// Commit the CPU move BEFORE accepting a player choice.
let computerMove = randomMove();
function randomMove() {
  const n = new Uint32Array(1);
  do { crypto.getRandomValues(n); } while (n[0] >= 4294967295);
  return moves[n[0] % 3];
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function tone(freq, duration = .12, type = 'square') {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, freq / 2), audio.currentTime + duration);
    gain.gain.setValueAtTime(.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio is optional; play continues if unavailable. */ }
}
function health() {
  for (const who of ['player', 'computer']) {
    $(who + '-hp').textContent = hp[who];
    $(who + '-fill').style.width = hp[who] + '%';
    $(who + '-meter').setAttribute('aria-valuenow', hp[who]);
  }
}
function state() { return { playerHP: hp.player, computerHP: hp.computer, round, busy, finished, matchWins: { ...matchWins } }; }
function callout(text, compact = true) {
  $('callout').classList.toggle('compact', compact);
  $('callout').querySelector('strong').textContent = text;
}
function clearEffects() {
  stage.classList.remove('counting', 'knockout');
  arena.classList.remove('flash');
  for (const who of ['player', 'computer']) {
    $(who + '-fighter').classList.remove('attack', 'hit', 'down');
    $(who + '-damage').classList.remove('pop');
  }
}
function showHand(who, move) {
  $(who + '-hand').src = 'assets/' + move + '.png';
  $(who + '-hand').alt = (who === 'player' ? 'Your hand: ' : 'Computer hand: ') + move;
}
function reset() {
  generation++; // Invalidates pending countdowns and knockout delays.
  hp = { player: 100, computer: 100 };
  round = 1; busy = false; finished = false;
  computerMove = randomMove();
  health(); clearEffects();
  showHand('player', 'rock'); showHand('computer', 'rock');
  $('round').textContent = '01';
  $('result').textContent = 'PICK YOUR MOVE';
  $('detail').textContent = 'Win a throw to deal 20 damage.';
  $('player-move').textContent = $('computer-move').textContent = 'READY';
  $('endgame').hidden = true;
  callout('READY?', false);
  buttons.forEach(button => { button.disabled = false; button.classList.remove('selected'); });
  return state();
}
async function play(move) {
  if (!moves.includes(move)) throw new Error('Choose rock, paper, or scissors.');
  if (busy || finished) throw new Error(finished ? 'Match finished. Start a rematch.' : 'Wait for the current round.');
  busy = true;
  const turn = generation, opponent = computerMove;
  showHand('player', 'rock'); showHand('computer', 'rock');
  clearEffects();
  buttons.forEach(button => { button.disabled = true; button.classList.toggle('selected', button.dataset.move === move); });
  $('player-move').textContent = $('computer-move').textContent = 'LOCKED';
  $('result').textContent = 'MOVES LOCKED';
  $('detail').textContent = 'Revealing both moves…';
  stage.classList.add('counting');
  for (const word of ['ROCK!', 'PAPER!', 'SCISSORS!']) {
    callout(word); tone(270 + word.length * 35, .08);
    await sleep(260);
    if (turn !== generation) return state();
  }
  stage.classList.remove('counting');
  showHand('player', move); showHand('computer', opponent);
  $('player-move').textContent = move.toUpperCase();
  $('computer-move').textContent = opponent.toUpperCase();
  const tie = move === opponent, won = beats[move] === opponent;
  if (tie) {
    callout('DRAW!');
    $('result').textContent = 'STALEMATE';
    $('detail').textContent = 'Same move. No damage. Go again!';
    tone(250, .15, 'triangle');
  } else {
    const winner = won ? 'player' : 'computer', loser = won ? 'computer' : 'player';
    $(winner + '-fighter').classList.add('attack');
    await sleep(150);
    if (turn !== generation) return state();
    hp[loser] = Math.max(0, hp[loser] - 20);
    health();
    $(loser + '-fighter').classList.add('hit');
    $(loser + '-damage').textContent = '−20';
    $(loser + '-damage').classList.add('pop');
    arena.classList.add('flash');
    callout(won ? 'YOU WIN!' : 'CPU WINS!');
    $('result').textContent = won ? 'YOU WIN THE THROW' : 'CPU WINS THE THROW';
    $('detail').textContent = phrases[won ? move : opponent] + (won ? '. CPU −20 HP.' : '. You −20 HP.');
    tone(won ? 440 : 110, .22, 'sawtooth');
  }
  finished = hp.player === 0 || hp.computer === 0;
  if (finished) {
    callout('K.O.!');
    stage.classList.add('knockout');
    const victory = hp.player > 0;
    matchWins[victory ? 'player' : 'computer']++;
    $('player-score').textContent = matchWins.player;
    $('computer-score').textContent = matchWins.computer;
    $(victory ? 'computer-fighter' : 'player-fighter').classList.add('down');
    $('result').textContent = victory ? 'VICTORY!' : 'DEFEAT!';
    $('detail').textContent = `Match finished in ${round} rounds.`;
    await sleep(1050);
    if (turn !== generation) return state();
    $('end-title').textContent = victory ? 'YOU WIN!' : 'YOU LOSE!';
    $('end-detail').textContent = `MATCH WINS · YOU ${matchWins.player} : ${matchWins.computer} CPU`;
    $('endgame').hidden = false;
    $('again').focus(); tone(victory ? 880 : 140, .4, 'triangle');
  } else {
    await sleep(500);
    if (turn !== generation) return state();
    round++;
    computerMove = randomMove();
    $('round').textContent = String(round).padStart(2, '0');
    buttons.forEach(button => { button.disabled = false; });
  }
  busy = false;
  return state();
}
buttons.forEach(button => button.addEventListener('click', () => play(button.dataset.move).catch(() => {})));
$('restart').onclick = reset;
$('again').onclick = () => { reset(); buttons[0].focus(); };
$('sound').onclick = () => { sound = !sound; $('sound').textContent = sound ? 'SOUND: ON' : 'SOUND: OFF'; $('sound').setAttribute('aria-pressed', String(sound)); tone(600); };
$('rules').onclick = () => $('dialog').showModal();
$('close').onclick = $('got-it').onclick = () => $('dialog').close();
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || $('dialog').open) return;
  const move = moves[Number(event.key) - 1];
  if (move && !busy && !finished) { event.preventDefault(); play(move).catch(() => {}); }
});
// Optional page tools use the same validated actions as the visible controls.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const tools = [
    { name: 'read_battle', description: 'Read HP, round and current battle state.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: state },
    { name: 'play_move', description: 'Play one round and return the resulting HP after the animation.', inputSchema: { type: 'object', properties: { move: { type: 'string', enum: moves } }, required: ['move'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: input => play(input?.move) },
    { name: 'restart_match', description: 'Reset both fighters to 100 HP and start a new match.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: reset }
  ];
  tools.forEach(tool => { try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} });
}
