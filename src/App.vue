<template>
	<div id="outer">
		<h1>Kana</h1>
		<div class="kana-box">
			<div id="reset-btn" v-if="!loading">
				<div class="btns left">
					<button
						@click="switchRandomizer"
						:title="`Currently using ${randomizer} randomization. Click to use ${randomizer === 'weighted' ? 'unweighted' : 'weighted'}.`"
						class="small">
						{{ randomizer === 'weighted' ? 'Weighted' : 'Unweighted' }}
					</button>
					<button v-if="randomizer === 'weighted'" @click="switchWeightStep" id="weight-step-btn" class="small" title="Type of weighting">
						{{ weightStepName }}
					</button>
					<button @click="nextKana(!isDev)" class="small red" title="This will count as an incorrect answer">Skip</button>
				</div>
				<div class="btns right">
					<button @click="resetSession" class="red small">Reset Session</button>
					<button @click="resetAll" class="red small">Reset All</button>
				</div>
			</div>
			<div id="kana" v-if="!loading">
				<p id="answer">{{ showAnswer ? store.selectedKana.romaji.join(', ') : '&nbsp;' }}</p>
				<p id="kana-text"><span @mouseover="toggleAnswer" @mouseleave="toggleAnswer">{{ store.selectedKana.kana }}</span></p>
			</div>
			<div id="kana" v-else>
				<p id="kana-text">
					<LoadingSpinner id="loading-spinner" />
				</p>
			</div>
			<div id="kana-input">
				<input type="text" id="kana-input-text" ref="kanaInputElem" v-model="kanaInputText" @input="kanaInput" />
			</div>
			<div id="message">
				<p id="message-text">{{ message || '&nbsp;' }}</p>
			</div>
			<div id="stats" v-if="!loading">
				<table>
					<thead v-if="store.stats.total > 0 || store.previousSessionStats.total > 0">
						<tr>
							<td></td>
							<th>Session</th>
							<th v-if="store.stats.total > 0 || store.previousSessionStats.total > 0">Overall</th>
							<th v-if="overallAvgTime || kanaAvgTime">Avg. Time</th>
						</tr>
					</thead>
					<tbody>
						<StatRow
							label="Total"
							:correct="store.stats.correct"
							:seen="store.stats.total"
							:previousCorrect="store.previousSessionStats.correct"
							:previousSeen="store.previousSessionStats.total"
							:avgTime="overallAvgTime" />
						<StatRow
							v-if="store.selectedKana.kana"
							id="kana-stats"
							:label="store.selectedKana.kana"
							:correct="store.getCurrentKanaStats()?.correct"
							:seen="store.getCurrentKanaStats()?.seen"
							:weight="currentKanaWeight"
							:previousCorrect="store.previousSessionStats.kanas[store.selectedKana.kana]?.correct"
							:previousSeen="store.previousSessionStats.kanas[store.selectedKana.kana]?.seen"
							:avgTime="kanaAvgTime" />
					</tbody>
				</table>
			</div>
		</div>
		<div id="options">
			<button id="showhide-button" @click="toggleOptions">
				{{ showOptions ? 'Hide' : 'Show' }} Tables
			</button>
			<!-- Options Tables -->
			<div id="options-tables" v-if="showOptions">
				<KanaTable v-for="table in tables" :key="table" :type="table" @btnClicked="saveSelections" />
			</div>
		</div>
	</div>
</template>

<script setup>
import KanaTable from './components/KanaTable.vue';
import StatRow from './components/StatRow.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import { onMounted, ref, computed, watchEffect, watch } from 'vue';
import { useStore } from './stores/store.js';
const proc = {
	env: import.meta.env,
};
const isDev = ref(proc.env.MODE === 'development');

const store = useStore();

const tables = ref(['hiragana', 'hiragana combinations', 'katakana', 'katakana combinations']);
const kanaInputElem = ref(null);
const kanaInputText = ref('');
const showAnswer = ref(false);
const showOptions = ref(true);
const message = ref('');
const loading = ref(false);
const randomizer = ref('weighted');
const weightStep = ref(0);
let incorrect = false;

const currentKanaWeight = computed(() => {
	return (randomizer.value === 'weighted') ? store.stats.kanas[store.selectedKana?.kana]?.weight || 0 : null;
});

function getStepFunction() {
	switch (weightStep.value) {
		case 0:
			return store.logStep;
		case 1:
			return store.exponentialStep;
		case 2:
			return store.linearStep;
		default:
			return store.logStep;
	}
}

const weightStepName = computed(() => {
	switch (weightStep.value) {
		case 0:
			return 'Logarithmic';
		case 1:
			return 'Exponential';
		case 2:
			return 'Linear';
		default:
			return 'Logarithmic';
	}
});

const overallAvgTime = computed(() => {
	if (store.stats.total <= 0 && store.previousSessionStats.total <= 0) return 0;
	const stats = store.stats;
	const prevStats = store.previousSessionStats;
	let avgTime = 0;
	let count = 0;
	for (const kanaStr of Object.keys(stats.kanas)) {
		const kana = stats.kanas[kanaStr];
		if (kana.seen > 0 && kana.averageTime) {
			avgTime = (avgTime * count + kana.averageTime * kana.seen) / (kana.seen + count);
			count++;
		}
	}
	for (const kanaStr of Object.keys(prevStats.kanas)) {
		const kana = prevStats.kanas[kanaStr];
		if (kana.seen > 0 && kana.averageTime) {
			avgTime = (avgTime * count + kana.averageTime * kana.seen) / (kana.seen + count);
			count++;
		}
	}
	return avgTime / 1000;
});

const kanaAvgTime = computed(() => {
	if (store.stats.total <= 0 && store.previousSessionStats.total <= 0) return 0;
	const stats = store.getCurrentKanaStats();
	const prevStats = store.previousSessionStats.kanas[store.selectedKana.kana];
	let avgTime = 0;
	let count = 0;
	if (stats?.seen > 0 && stats.averageTime) {
		avgTime = (avgTime * count + stats.averageTime * stats.seen) / (stats.seen + count);
		count++;
	}
	if (prevStats?.seen > 0 && prevStats.averageTime) {
		avgTime = (avgTime * count + prevStats.averageTime * prevStats.seen) / (prevStats.seen + count);
		count++;
	}
	return avgTime / 1000;
});

async function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const endingChars = ['a', 'i', 'u', 'e', 'o'];

async function kanaInput() {
	if (store.selectedKana.romaji.includes(kanaInputText.value)) {
		await delay(100);
		if (message.value === '') {
			store.stats.total++;
			store.stats.correct++;
			const kanaStats = store.getCurrentKanaStats();
			if (kanaStats?.correct) {
				kanaStats.correct++;
			} else if (kanaStats) {
				kanaStats.correct = 1;
			} else {
				store.stats.kanas[store.selectedKana.kana] = { correct: 1 };
			}
		}
		nextKana(!incorrect);
		store.startTime = Date.now();
		kanaInputText.value = '';
		incorrect = false;
		message.value = '';
	} else if (endingChars.includes(kanaInputText.value.slice(-1))) {
		// substring of the second to last character
		const lastChar = kanaInputText.value.slice(-2, -1);
		if (endingChars.includes(lastChar)) {
			kanaInputText.value = kanaInputText.value.slice(0, -1);
			return;
		}
		if (message.value) return;
		store.stats.total++;
		incorrect = true;
		const kanaStats = store.getCurrentKanaStats();
		if (kanaStats?.seen) {
			kanaStats.seen++;
		} else if (kanaStats) {
			kanaStats.seen = 1;
		} else {
			store.stats.kanas[store.selectedKana.kana] = { seen: 1 };
		}
		message.value = `${store.selectedKana.kana} = ${store.selectedKana.romaji.join(', ')}`;
	}
}

function nextKana(incrementSeen) {
	if (randomizer.value === 'weighted') {
		store.selectWeightedKana(incrementSeen, getStepFunction());
	} else {
		store.selectRandomKana(incrementSeen);
	}
	store.startTime = Date.now();
	focusInput();
}

function switchWeightStep() {
	weightStep.value = (weightStep.value + 1) % 3;
	focusInput();
}

function switchRandomizer() {
	if (randomizer.value === 'weighted') {
		randomizer.value = 'unweighted';
	} else {
		randomizer.value = 'weighted';
	}
	focusInput();
}

function resetSession() {
	store.stats.correct = 0;
	store.stats.total = 0;
	message.value = '';
	store.stats.kanas = {};
	incorrect = false;
	nextKana(false);
}

async function resetAll() {
	store.previousSessionStats.correct = 0;
	store.previousSessionStats.total = 0;
	store.previousSessionStats.kanas = {};
	await store.resetDb();
	resetSession();
}

function saveSelections() {
	if (!store.enabledKanaSections[0]) return;
	store.saveSections();
	focusInput();
}

function toggleAnswer() {
	showAnswer.value = !showAnswer.value;
}

function toggleOptions() {
	showOptions.value = !showOptions.value;
	focusInput();
}

function focusInput() {
	kanaInputElem.value.focus({ preventScroll: true });
}

onMounted(async () => {
	loading.value = true;
	await store.loadSession();
	nextKana(false);
	loading.value = false;

	window.addEventListener('beforeunload', async (event) => {
		event.preventDefault();
		await store.saveSession();
	});
});
</script>

<style scoped>
#outer {
	max-width: 50em;
	min-width: 320px;
	width: 50vw;
	margin: 2em auto;
}

.kana-box {
	display: flex;
	flex-direction: column;
	padding: 1em;
	border-top: 1px dashed #ccc;
	background-color: rgba(0, 0, 0, 0.1);
	box-shadow: var(--box-shadow);
}

#kana-text {
	font-size: 5em;
	text-align: center;
}

#options {
	display: flex;
	flex-direction: column;
}

#showhide-button {
	margin: 1em auto;
}

#kana {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

#answer {
	color: #aaa;
	pointer-events: none;
}

#kana-input-text {
	text-align: center;
	font-size: 1.2em;
	background-color: #444;
	color: var(--foreground-color);
}

#message-text {
	color: var(--danger-color);
	padding: 0.5em;
	text-align: center;
}

.percent {
	font-size: 0.85em;
}

#reset-btn {
	position: relative;
}

#reset-btn .btns {
	display: flex;
	flex-direction: row;
	gap: 0.5em;
	position: absolute;
	top: 0;
}

#reset-btn .btns.right {
	right: 0;
}

#reset-btn .btns.left {
	left: 0;
}

#stats table {
	border: none;
	width: fit-content;
	font-size: 0.8em;
	white-space: nowrap;
}

#stats thead th,
#stats thead td {
	border: 1px solid var(--dark-color);
	text-align: center;
}

:deep(#kana-stats) .stat-label {
	font-size: 1.2em;
}

#loading-spinner {
	margin-top: 0.4em;
}

#weight-step-btn {
	min-width: 83px;
}

@media screen and (max-width: 1070px) {
	#outer {
		width: 75vw;
	}
}

@media screen and (max-width: 715px) {
	#outer {
		width: 95vw;
	}

	#reset-btn .btns {
		flex-direction: column;
	}
}

@media screen and (max-width: 560px) {
	#stats {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	#stats table {
		width: 100%;
	}
}

@media screen and (max-width: 360px) {
	.kana-box {
		padding: 1em 0;
	}

	#kana-input {
		margin: 0 0.5em;
	}

	#reset-btn {
		margin: 0 0.5em;
	}

	#stats table {
		width: 100%;
	}
}
</style>
