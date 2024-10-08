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
		<div class="multi-table">
			<table ref="tableElem" v-for="(part, n) in splitKanaList" :key="n">
				<thead>
					<tr>
						<th v-for="i in part.length" :key="i">
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
						<td v-for="j in part.length" :key="j">
							<span class="kana">{{ getKanaFromRowCol(i, j) }}</span>
							<br />
							<span class="romaji">{{ getKanaFromRowCol(i, j, true) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup>
import kana from '@/assets/kana.json';
import { onMounted, ref, computed } from 'vue';
import { useStore } from '@/stores/store.js';

const windowWidth = ref(window.innerWidth);
const tableElem = ref(null);
const tableMinWidth = ref(0);
const tableIsSplit = ref(false);

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

function calculateMinWidths() {
	if (!tableElem.value?.[0]) return;
	if (tableElem.value[1]) return; // Already split table
	const tableWidth = tableElem.value[0]?.offsetWidth;
	if (!tableWidth) return;

	const clone = tableElem.value[0].cloneNode(true);
	clone.style.width = 'fit-content';
	clone.style.position = 'absolute'; // Avoid affecting layout
	clone.style.visibility = 'hidden'; // Make it invisible

	// Append clone to the body to measure its "fit-content" width
	document.body.appendChild(clone);

	// Set refs
	tableMinWidth.value = clone.offsetWidth;
	tableIsSplit.value = tableMinWidth.value >= tableWidth;

	// Remove clone
	document.body.removeChild(clone);
}

const splitKanaList = computed(() => {
	if (!tableIsSplit.value) return [kanaList.value];
	const middleIndex = Math.ceil(kanaList.value.length / 2);
	const firstHalf = kanaList.value.slice(0, middleIndex);
	const secondHalf = kanaList.value.slice(middleIndex);
	return [firstHalf, secondHalf];
})


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

	calculateMinWidths();

	window.addEventListener('resize', () => {
		windowWidth.value = window.innerWidth;
		const tableWidth = tableElem.value[0]?.offsetWidth;
		if (!tableWidth) return;

		if (!tableIsSplit.value && tableMinWidth.value >= tableWidth) {
			tableIsSplit.value = true;
		} else if (tableIsSplit.value && tableMinWidth.value < tableWidth) {
			tableIsSplit.value = false;
		}
	});
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
	align-items: flex-end;
}

.romaji {
	color: #aaa;
	font-size: 0.8em;
}

span.kana {
	white-space: nowrap;
}

.divider {
	pointer-events: none;
}

td {
	padding: 0.5em;
	text-align: center;
}

.checkall {
	font-size: 0.8em;
	white-space: nowrap;
}

input:disabled {
	cursor: not-allowed;
}

.multi-table {
	display: flex;
	flex-direction: column;
	gap: 1em;
}
</style>
