// ===== workouts.js =====
// Workout entries are stored separately from food logs: db.workouts[YYYY-MM-DD].

const WORKOUT_ACTIVITIES = ['Running', 'Weightlifting', 'Cycling', 'Walking', 'Swimming', 'HIIT', 'Yoga', 'Other'];
const CARDIO_ACTIVITIES = new Set(['Running', 'Cycling', 'Walking', 'Swimming']);

/** @typedef {{activityType:string, durationMinutes:number, caloriesBurned:number, distanceKm?:number|null, pace?:{minutesPerKm:number|null,kmPerHour:number|null,display:string|null}, rpe:number, heartRateAvg?:number|null, netCaloriesBurned:number}} WorkoutEntry */

function baselineBmrForDuration(durationMinutes, profile = db.profile) {
  const minutes = Math.max(0, Number(durationMinutes) || 0);
  return profile ? calcBMR(profile) / 1440 * minutes : 0;
}

function calculateNetWorkoutBurn(caloriesBurned, durationMinutes, profile = db.profile) {
  return Math.max(0, (Number(caloriesBurned) || 0) - baselineBmrForDuration(durationMinutes, profile));
}

function derivePace(durationMinutes, distanceKm) {
  const duration = Number(durationMinutes);
  const distance = Number(distanceKm);
  if (!(duration > 0 && distance > 0)) return { minutesPerKm: null, kmPerHour: null, display: null };
  const minutesPerKm = duration / distance;
  const wholeMinutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - wholeMinutes) * 60);
  return {
    minutesPerKm: Math.round(minutesPerKm * 100) / 100,
    kmPerHour: Math.round((distance / (duration / 60)) * 100) / 100,
    display: `${wholeMinutes}:${String(seconds).padStart(2, '0')} min/km · ${(distance / (duration / 60)).toFixed(1)} km/h`,
  };
}

function workoutsForDate(date) { return (db.workouts && db.workouts[date]) || []; }
function netWorkoutBurnForDate(date) { return workoutsForDate(date).reduce((sum, workout) => sum + Number(workout.netCaloriesBurned || calculateNetWorkoutBurn(workout.caloriesBurned, workout.durationMinutes)), 0); }

function renderWorkoutPage() {
  const target = document.getElementById('workout-page-module');
  if (!target) return;
  const date = viewKey();
  const workouts = workoutsForDate(date);
  const netBurn = netWorkoutBurnForDate(date);
  target.innerHTML = `
    <div class="workout-module">
      <div class="workout-summary"><span>Training am ${esc(date)}</span><strong>+${Math.round(netBurn)} kcal netto</strong></div>
      <div class="form-group"><label class="form-label" for="workout-activity">Aktivität</label><select class="form-input" id="workout-activity" onchange="toggleWorkoutDistance()">${WORKOUT_ACTIVITIES.map(a => `<option value="${a}">${a}</option>`).join('')}</select></div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label" for="workout-duration">Dauer</label><div class="input-wrap"><input class="form-input" type="number" min="1" id="workout-duration" oninput="updateWorkoutPace()"><span class="input-unit">min</span></div></div>
        <div class="form-group"><label class="form-label" for="workout-calories">Verbrannt (brutto)</label><div class="input-wrap"><input class="form-input" type="number" min="0" id="workout-calories" oninput="updateWorkoutPace()"><span class="input-unit">kcal</span></div></div>
        <div class="form-group" id="workout-distance-group"><label class="form-label" for="workout-distance">Distanz</label><div class="input-wrap"><input class="form-input" type="number" min="0" step="0.01" id="workout-distance" oninput="updateWorkoutPace()"><span class="input-unit">km</span></div></div>
        <div class="form-group"><label class="form-label" for="workout-rpe">RPE</label><div class="input-wrap"><input class="form-input" type="number" min="1" max="10" id="workout-rpe" placeholder="1–10"><span class="input-unit">/10</span></div></div>
        <div class="form-group"><label class="form-label" for="workout-heart-rate">Ø Herzfrequenz</label><div class="input-wrap"><input class="form-input" type="number" min="1" id="workout-heart-rate"><span class="input-unit">bpm</span></div></div>
      </div>
      <div class="workout-preview" id="workout-preview">Pace wird aus Dauer und Distanz berechnet.</div>
      <button class="btn-primary" onclick="saveWorkout()">Training speichern</button>
      <div class="workout-list">${workouts.length ? workouts.map((w, index) => `<div class="workout-row"><span><b>${esc(w.activityType)}</b><small>${w.durationMinutes} min${w.distanceKm ? ` · ${w.distanceKm} km` : ''}${w.pace && w.pace.display ? ` · ${w.pace.display}` : ''}</small></span><span>+${Math.round(w.netCaloriesBurned)} kcal <button class="workout-delete" onclick="deleteWorkout(${index})" aria-label="Training löschen">×</button></span></div>`).join('') : '<p class="workout-empty">Noch kein Training für diesen Tag.</p>'}</div>
    </div>`;
  toggleWorkoutDistance();
}

function toggleWorkoutDistance() {
  const activity = document.getElementById('workout-activity');
  const group = document.getElementById('workout-distance-group');
  if (activity && group) group.style.display = CARDIO_ACTIVITIES.has(activity.value) ? '' : 'none';
  updateWorkoutPace();
}

function updateWorkoutPace() {
  const preview = document.getElementById('workout-preview');
  if (!preview) return;
  const pace = derivePace(document.getElementById('workout-duration').value, document.getElementById('workout-distance').value);
  const gross = Number(document.getElementById('workout-calories').value) || 0;
  const baseline = baselineBmrForDuration(document.getElementById('workout-duration').value);
  preview.textContent = `${pace.display || 'Pace: Dauer + Distanz eingeben'} · Netto-Workout-Burn: ${Math.round(Math.max(0, gross - baseline))} kcal (BMR-Anteil ${Math.round(baseline)} kcal abgezogen)`;
}

function saveWorkout() {
  const activityType = document.getElementById('workout-activity').value;
  const durationMinutes = Number(document.getElementById('workout-duration').value);
  const caloriesBurned = Number(document.getElementById('workout-calories').value);
  const rpe = Number(document.getElementById('workout-rpe').value);
  const distanceValue = document.getElementById('workout-distance').value;
  const heartRateValue = document.getElementById('workout-heart-rate').value;
  if (!(durationMinutes > 0 && caloriesBurned >= 0 && rpe >= 1 && rpe <= 10)) { showToast('Bitte Dauer, Brutto-Kalorien und RPE (1–10) prüfen.', 'warning'); return; }
  const distanceKm = distanceValue === '' ? null : Number(distanceValue);
  if (distanceKm != null && distanceKm < 0) { showToast('Die Distanz darf nicht negativ sein.', 'warning'); return; }
  const entry = { _id: uid(), activityType, durationMinutes, caloriesBurned, distanceKm, pace: derivePace(durationMinutes, distanceKm), rpe, heartRateAvg: heartRateValue === '' ? null : Number(heartRateValue) || null, netCaloriesBurned: Math.round(calculateNetWorkoutBurn(caloriesBurned, durationMinutes) * 10) / 10 };
  const date = viewKey();
  if (!db.workouts) db.workouts = {};
  if (!db.workouts[date]) db.workouts[date] = [];
  db.workouts[date].push(entry);
  save(); renderWorkoutPage(); renderToday(); showToast('🏋️ Training gespeichert', 'success');
}

function deleteWorkout(index) { db.workouts[viewKey()].splice(index, 1); save(); renderWorkoutPage(); renderToday(); }
