<template>
	<div class="outer">
		<h3>
			<span class="title">{{ upperCaseFirstOfEachWord(type) }}</span>
			<span class="checkall">
				<a @click="checkAll">check all</a>
				<span class="divider"> | </span>
				<a @click="uncheckAll">uncheck all</a>
			</span>
		</h3>
		<table>
			<thead>
				<tr>
					<th v-for="i in colCount" :key="i">
						<input
							type="checkbox"
							class="kanacheck"
							:id="inputId(i)"
							:checked="getChecked(i)"
							@input="check(i)"
							:title="getChecked(i) && store.enabledKanaSections.length === 1 ? 'At least one option must be selected' : ''"
							:disabled="getChecked(i) && store.enabledKanaSections.length === 1" />
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="i in rowCount" :key="i">
					<td v-for="j in colCount" :key="j">
						<span class="kana">{{ getKanaFromRowCol(i, j) }}</span>
						<br />
						<span class="romaji">{{ getKanaFromRowCol(i, j, true) }}</span>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup>
import kana from '../assets/kana.json';
import { onMounted, ref, computed } from 'vue';
import { useStore } from '../stores/store.js';

const store = useStore();

const props = defineProps({
	type: {
		type: String,
		required: true
	},
});

const emit = defineEmits(['btnClicked']);

const kanaTable = ref(kana);
const kanaList = ref(kanaTable.value[props.type]);
const colCount = ref(kanaList.value.length);
const rowCount = ref(kanaList.value[0].length);


function getKanaFromRowCol(i, j, val = false) {
	const entry = kanaList.value[j - 1][i - 1];
	if (!entry) return '';
	const character = val ? entry.romaji.join(', ') : entry.kana;
	return character;
}

const getChecked = computed(() => (i) => {
	return store.enabledKanaSections.includes(inputId(i));
});

function checkAll() {
	for (let i = 1; i <= colCount.value; i++) {
		if (store.enabledKanaSections.includes(inputId(i))) continue;
		store.toggleSection(inputId(i));
	}
	emit('btnClicked');
}

function uncheckAll() {
	for (let i = 1; i <= colCount.value; i++) {
		if (!store.enabledKanaSections.includes(inputId(i))) continue;
		store.toggleSection(inputId(i));
	}
	emit('btnClicked');
}

function check(i) {
	store.toggleSection(inputId(i));
	emit('btnClicked');
}

function inputId(i) {
	return `${props.type}_-_${i}`
}

function upperCaseFirstOfEachWord(str) {
	return str.replace(/^(.)|\s+(.)/g, ($1) => $1.toUpperCase());
}

onMounted(() => {
	if (store.enabledKanaSections.length === 0 && props.type === 'hiragana') {
		store.enabledKanaSections.push(inputId(1));
	}
});
</script>

<style scoped>
.outer {
	margin-top: 2em;
}

table {
	box-shadow: var(--box-shadow);
}

table,
thead,
tbody,
th,
td {
	border: 1px solid black;
	border-collapse: collapse;
}

h3 {
	display: flex;
	justify-content: space-between;
}

.romaji {
	color: #aaa;
	font-size: 0.8em;
}

.divider {
	pointer-events: none;
}

td {
	padding: 0.5em;
	text-align: center;
}

.checkall a {
	cursor: pointer;
}

input:disabled {
	cursor: not-allowed;
}
</style>
