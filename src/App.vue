<template>
	<div id="outer">
		<h1>Kana</h1>
		<div id="kana-box">
			<div id="reset-btn">
				<button @click="reset">Reset</button>
			</div>
			<div id="kana">
				<p id="answer">{{ showAnswer ? store.selectedKana.romaji.join(', ') : '&nbsp;' }}</p>
				<p id="kana-text"><span @mouseover="toggleAnswer" @mouseleave="toggleAnswer">{{ store.selectedKana.kana }}</span></p>
			</div>
			<div id="kana-input">
				<input type="text" id="kana-input-text" ref="kanaInputElem" v-model="kanaInputText" @input="kanaInput" />
			</div>
			<div id="message">
				<p id="message-text">{{ message || '&nbsp;' }}</p>
			</div>
			<div id="stats">
				<p id="stats-text" title="Correct / Total">
					<span class="stat-label">Overall: </span><span class="correct">{{ store.stats.correct }}</span> / <span class="total">{{ store.stats.total }}</span> <sup v-if="store.stats.total" class="percent" :style="{ color: getPercentColor }">({{ percent }}%)</sup>
				</p>
				<p id="kana-stats" v-if="store.selectedKana.kana">
					<span class="stat-label">{{ store.selectedKana.kana }}: </span><span class="correct">{{ store.stats[store.selectedKana.kana]?.correct || 0 }}</span> / <span class="total">{{ store.stats[store.selectedKana.kana]?.seen || 0 }}</span> <sup v-if="store.stats[store.selectedKana.kana]?.seen" class="percent" :style="{ color: getKanaPercentColor }">({{ (store.stats[store.selectedKana.kana].correct / store.stats[store.selectedKana.kana].seen * 100).toFixed(2) }}%)</sup>
				</p>
			</div>
		</div>
		<div id="options">
			<button id="showhide-button" @click="toggleOptions">
				{{ showOptions ? 'Hide' : 'Show' }} Tables
			</button>
			<!-- Options Tables -->
			<div id="options-tables" v-if="showOptions">
				<KanaTable type="hiragana" @btnClicked="focusInput" />
				<KanaTable type="hiragana combinations" @btnClicked="focusInput" />
				<KanaTable type="katakana" @btnClicked="focusInput" />
				<KanaTable type="katakana combinations" @btnClicked="focusInput" />
			</div>
		</div>
	</div>
</template>

<script setup>
import KanaTable from './components/KanaTable.vue';
import { onMounted, ref, computed, watch } from 'vue';
import { useStore } from './stores/store.js';

const store = useStore();

const kanaInputElem = ref(null);
const kanaInputText = ref('');
const showAnswer = ref(false);
const showOptions = ref(true);
const message = ref('');
let incorrect = false;

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
			const kanaStats = store.stats[store.selectedKana.kana];
			if (kanaStats?.correct) {
				kanaStats.correct++;
			} else if (kanaStats) {
				kanaStats.correct = 1;
			} else {
				store.stats[store.selectedKana.kana] = { correct: 1 };
			}
		}
		store.selectRandomKana(!incorrect);
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
		const kanaStats = store.stats[store.selectedKana.kana];
		if (kanaStats?.seen) {
			kanaStats.seen++;
		} else if (kanaStats) {
			kanaStats.seen = 1;
		} else {
			store.stats[store.selectedKana.kana] = { seen: 1 };
		}
		message.value = `${store.selectedKana.kana} = ${store.selectedKana.romaji.join(', ')}`;
	}
}

function reset() {
	store.stats.correct = 0;
	store.stats.total = 0;
	message.value = '';
	store.stats = {};
	incorrect = false;
	store.selectRandomKana();
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
	kanaInputElem.value.focus();
}

const percent = computed(() => ((store.stats.correct / store.stats.total) * 100).toFixed(2));

function interpolateColor(color1, color2, factor) {
	const result = color1.slice();
	for (let i = 0; i < 3; i++) {
		result[i] = Math.round(color1[i] + factor * (color2[i] - color1[i]));
	}
	return result;
}

function getColor(percentVal) {
	const colors = [
		{ threshold: 0, color: [255, 0, 0] }, // red
		{ threshold: 50, color: [165, 42, 42] }, // brown
		{ threshold: 60, color: [255, 165, 0] }, // orange
		{ threshold: 70, color: [255, 255, 0] }, // yellow
		{ threshold: 80, color: [255, 192, 203] }, // pink
		{ threshold: 90, color: [0, 255, 255] }, // cyan
		{ threshold: 100, color: [0, 255, 0] }, // green
	];

	let lowerColor, upperColor;
	for (let i = 0; i < colors.length - 1; i++) {
		if (percentVal >= colors[i].threshold && percentVal <= colors[i + 1].threshold) {
			lowerColor = colors[i];
			upperColor = colors[i + 1];
			break;
		}
	}

	if (!lowerColor) {
		// If the percent is above 100%, return the last color
		return `rgb(${colors[colors.length - 1].color.join(', ')})`;
	}

	const range = upperColor.threshold - lowerColor.threshold;
	const factor = (percentVal - lowerColor.threshold) / range;
	const interpolatedColor = interpolateColor(lowerColor.color, upperColor.color, factor);

	return `rgb(${interpolatedColor.join(', ')})`;
}

const getPercentColor = computed(() => {
	const percentVal = (store.stats.correct / store.stats.total) * 100;
	return getColor(percentVal);
});

const getKanaPercentColor = computed(() => {
	const percentVal = (store.stats[store.selectedKana.kana].correct / store.stats[store.selectedKana.kana].seen) * 100;
	return getColor(percentVal);
})

onMounted(() => {
	store.selectRandomKana();
	focusInput();
});
</script>

<style scoped>
#outer {
	max-width: 50em;
	min-width: 20em;
	width: 50vw;
	margin: 2em auto;
}

#kana-box {
	display: flex;
	flex-direction: column;
	padding: 1em;
	border-top: 1px dashed #ccc;
	background-color: rgba(0, 0, 0, 0.1);
	box-shadow: 1px 2px 2px 1px rgba(0, 0, 0, 0.12), 1px 2px 2px 1px rgba(0, 0, 0, 0.24);
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

#stats-text,
#kana-stats {
	font-size: 0.8em;
}

.percent {
	font-size: 0.85em;
}

#reset-btn {
	position: relative;
}

#reset-btn button {
	position: absolute;
	top: 0;
	right: 0;
}
</style>
