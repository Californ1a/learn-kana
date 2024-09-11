<template>
	<div class="timer" v-if="timerRunning">
		<h1>{{ timeStr }}</h1>
		<button class="small red" @click="stopTimer">Stop</button>
	</div>
	<div v-else class="timer-setup">
		<div :class="{ 'title': justEnded }">
			<h4>Timer</h4>
			<button v-if="justEnded" class="small" @click="openInput">Open Input</button>
		</div>
		<form @submit.prevent="startTimer">
			<div class="minutes">
				<input type="number" v-model="totalMinutes" min="1" max="60" step="1" placeholder="Minutes" required title="Total time in minutes for the countdown timer." />
				<button class="green" type="submit">Start</button>
			</div>
			<div class="pause" title="Will pause the countdown when the window is minimized or the tab is in the background.">
				<input type="checkbox" id="pauseOnHidden" v-model="pauseOnHidden" />
				<label for="pauseOnHidden">Pause on hidden</label>
			</div>
		</form>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const timeRemaining = ref(0);
const timerRunning = ref(false);
const timeStr = ref('00:00');
// const startTime = ref(0);
const elapsed = ref(0);
const totalMinutes = ref(10);
const interval = ref(null);
const intervalTime = ref(1000);
const paused = ref(false);
const pauseOnHidden = ref(true);
const justEnded = ref(false);

const emits = defineEmits(['timer-start', 'timer-pause', 'timer-resume', 'timer-stop']);

function formatDuration(ms) {
	// Convert ms to seconds, minutes, and hours
	let totalSeconds = Math.floor(ms / 1000);
	let seconds = totalSeconds % 60;
	let totalMinutes = Math.floor(totalSeconds / 60);
	let minutes = totalMinutes % 60;
	let hours = Math.floor(totalMinutes / 60);

	// Pad minutes and seconds with leading zeros
	let formattedHours = String(hours).padStart(2, '0') + ':';
	let formattedMinutes = String(minutes).padStart(2, '0') + ':';
	let formattedSeconds = String(seconds).padStart(2, '0');

	// Return the formatted time string
	return `${(hours > 0) ? formattedHours : ''}${formattedMinutes}${formattedSeconds}`;
}

function updateTimer() {
	if (paused.value) return;
	if (!timerRunning.value) return;
	timeRemaining.value -= intervalTime.value;
	elapsed.value += intervalTime.value;
	timeStr.value = formatDuration(timeRemaining.value);
	if (timeRemaining.value <= 0) {
		timerRunning.value = false;

		clearInterval(interval.value);
		interval.value = null;
		justEnded.value = true;
		emits('timer-stop');

		// TODO: show alert
	}
}

function openInput() {
	justEnded.value = false;
	emits('timer-start');
}

function startTimer() {
	if (timerRunning.value) return;

	totalMinutes.value = parseInt(totalMinutes.value, 10);

	if (totalMinutes.value <= 0) {
		totalMinutes.value = 1;
	}

	// startTime.value = Date.now();
	timeRemaining.value = totalMinutes.value * 60 * 1000;
	elapsed.value = 0;
	paused.value = false;
	justEnded.value = false;

	timeStr.value = formatDuration(timeRemaining.value);
	timerRunning.value = true;

	interval.value = setInterval(updateTimer, intervalTime.value);
	emits('timer-start');
}

function stopTimer() {
	timerRunning.value = false;
	timeRemaining.value = 0;
	elapsed.value = 0;
	timeStr.value = '00:00';
	if (interval.value) {
		clearInterval(interval.value);
		interval.value = null;
	}
	justEnded.value = true;
	emits('timer-stop');
}

function pauseTimer() {
	if (timerRunning.value) {
		paused.value = true;
		clearInterval(interval.value);
		interval.value = null;
	}
}

function resumeTimer() {
	if (timerRunning.value) {
		paused.value = false;
		interval.value = setInterval(updateTimer, intervalTime.value);
	}
}

function visibilityChange(event) {
	if (!pauseOnHidden.value) return;
	if (event.target.visibilityState === 'hidden') {
		pauseTimer();
	} else if (event.target.visibilityState === 'visible') {
		resumeTimer();
	}
}

onMounted(() => {
	window.addEventListener('visibilitychange', visibilityChange);
});

onUnmounted(() => {
	window.removeEventListener('visibilitychange', visibilityChange);

	if (interval.value) {
		clearInterval(interval.value);
		interval.value = null;
	}
});
</script>

<style scoped>
.title {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.timer {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 0.5em;
}

.minutes input {
	background-color: #444;
	color: var(--foreground-color);
	border-radius: 5px;
}

.timer h1 {
	margin-bottom: 0;
}

.timer-setup h4 {
	text-align: center;
}

.timer-setup form {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 0.5em;
}

.minutes {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 0.5em;
}

.minutes input {
	min-width: 6em;
}

.pause {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 0.5em;
}

.pause input {
	width: auto;
}
</style>
