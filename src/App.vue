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
				<table title="Correct / Total">
					<tbody>
						<StatRow
							label="Overall"
							:correct="store.stats.correct"
							:seen="store.stats.total" />
						<StatRow
							v-if="store.selectedKana.kana"
							id="kana-stats"
							:label="store.selectedKana.kana"
							:correct="store.getCurrentKanaStats()?.correct"
							:seen="store.getCurrentKanaStats()?.seen"
							:weight="store.getCurrentKanaStats()?.weight" />
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
import StatRow from './components/StatRow.vue';
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
			const kanaStats = store.getCurrentKanaStats();
			if (kanaStats?.correct) {
				kanaStats.correct++;
			} else if (kanaStats) {
				kanaStats.correct = 1;
			} else {
				store.stats[store.selectedKana.kana] = { correct: 1 };
			}
		}
		store.selectWeightedKana(!incorrect);
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

onMounted(() => {
	store.selectWeightedKana();
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

#reset-btn button {
	position: absolute;
	top: 0;
	right: 0;
}

#stats table {
	border: none;
	width: fit-content;
	font-size: 0.8em;
}

:deep(#kana-stats) .stat-label {
	font-size: 1.2em;
}
</style>
