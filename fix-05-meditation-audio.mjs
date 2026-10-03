// Fix 5: replace the meditation music with the original "Wellbeing Ambient" track and stop showing a filename on screen.
// Upload meditation-music.mp3 (the new 4.8 MB track) to the repo root next to this script, then:
//   node fix-05-meditation-audio.mjs
// Checks everything first; changes nothing unless all checks pass.
import fs from 'node:fs';
import crypto from 'node:crypto';

const fail = (msg) => { console.error(`FAIL: ${msg}. Nothing changed.`); process.exit(1); };

const NEW_TRACK = 'meditation-music.mp3';                  // uploaded to repo root
const TARGET = 'assets/audio/meditation-music.mp3';
const EXPECTED_SHA256 = '91e8d3088fccce48699f8dba989e89fd01ca5a69bb4674454db7cea4f8b038ce';
const SCREEN = 'src/screens/MeditationScreen.tsx';

if (!fs.existsSync('app.json')) fail('run from the repo root');
if (!fs.existsSync(NEW_TRACK)) fail(`${NEW_TRACK} not found in the repo root; upload it first`);
const sha = crypto.createHash('sha256').update(fs.readFileSync(NEW_TRACK)).digest('hex');
if (sha !== EXPECTED_SHA256) fail(`${NEW_TRACK} is not the expected track (sha256 ${sha.slice(0, 12)}…); re-download and upload it again`);
if (!fs.existsSync(TARGET)) fail(`${TARGET} not found`);

const FROM = `<Text style={styles.audioNoteTitle}>Ambient audio ready</Text><Text style={styles.audioNoteText}>meditation-music.mp3 plays at a gentle volume when you begin a practice.</Text>`;
const TO = `<Text style={styles.audioNoteTitle}>Ambient sound</Text><Text style={styles.audioNoteText}>A soft, calming soundscape plays gently when you begin a practice.</Text>`;
const code = fs.readFileSync(SCREEN, 'utf8');
const count = code.split(FROM).length - 1;
if (count !== 1) fail(`[${SCREEN}] expected 1 match of the audio note text, found ${count}`);

fs.writeFileSync(SCREEN, code.replace(FROM, () => TO));
fs.renameSync(NEW_TRACK, TARGET);
console.log(`OK: ${TARGET} replaced (original work, 5:00, 4.8 MB) and on-screen text updated`);
