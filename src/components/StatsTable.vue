<template>
	<table class="stats-table">
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
</template>

<script setup>
import StatRow from '@/components/StatRow.vue';
import { useStore } from '@/stores/store.js';
import { computed } from 'vue';

const store = useStore();

const props = defineProps({
	randomizer: {
		type: String,
		required: true
	}
});

const currentKanaWeight = computed(() => {
	return (props.randomizer === 'weighted') ? store.stats.kanas[store.selectedKana?.kana]?.weight || 0 : null;
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
</script>

<style scoped>
table {
	border: none;
	width: fit-content;
	font-size: 0.8em;
	white-space: nowrap;
}

thead th,
thead td {
	border: 1px solid var(--dark-color);
	text-align: center;
}
</style>
