import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '../db.js';
import allKana from '../assets/kana.json';

export const useStore = defineStore('store', () => {
	const enabledKanaSections = ref([]);
	const enabledKanas = ref([]);
	const selectedKana = ref({ kana: '', romaji: '' });
	const previousSessionStats = ref({
		total: 0,
		correct: 0,
		kanas: {}
	});
	const stats = ref({
		total: 0,
		correct: 0,
		kanas: {}
	});
	const startTime = ref(null);

	function getCurrentKanaStats() {
		if (!stats.value.kanas[selectedKana.value?.kana]) return null;
		return stats.value.kanas[selectedKana.value.kana];
	}

	function getAllKanas(kanaOnly = false) {
		const list = []
		for (const type of Object.keys(allKana)) {
			const kanaOfType = allKana[type];
			list.push(...kanaOfType.flat().filter(kana => kana && kana.kana !== ''));
		}
		return kanaOnly ? list.map(kana => kana.kana) : list;
	}

	function sortEnabledKanas() {
		const kanas = enabledKanas.value.filter(kana => kana && kana.kana !== selectedKana.value.kana);
		const unseenKanas = kanas.filter(kana => !stats.value.kanas[kana.kana]?.seen && !previousSessionStats.value.kanas[kana.kana]?.seen);
		const seenKanas = kanas.filter(kana => stats.value.kanas[kana.kana]?.seen || previousSessionStats.value.kanas[kana.kana]?.seen);

		// shuffle unseen
		for (let i = unseenKanas.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[unseenKanas[i], unseenKanas[j]] = [unseenKanas[j], unseenKanas[i]];
		}

		// Precompute stats for sorting
		const kanaStats = {};
		seenKanas.forEach(kana => {
			const stat = stats.value.kanas[kana.kana] || {};
			const prevStat = previousSessionStats.value.kanas[kana.kana] || {};

			const seen = (stat.seen || 0) + (prevStat.seen || 0);
			const correct = (stat.correct || 0) + (prevStat.correct || 0);
			const percent = seen ? correct / seen : 0;

			const avgTime = seen ? (((stat.averageTime || 0) * (stat.seen || 0))
				+ ((prevStat.averageTime || 0) * (prevStat.seen || 0))) / seen : 0;

			kanaStats[kana.kana] = { seen, percent, avgTime };
		});

		// Sort the original seenKanas array using the precomputed stats
		seenKanas.sort((a, b) => {
			const statA = kanaStats[a.kana];
			const statB = kanaStats[b.kana];

			if (statA.seen !== statB.seen) return statA.seen - statB.seen;
			if (statA.percent !== statB.percent) return statA.percent - statB.percent;
			return statB.avgTime - statA.avgTime;
		});

		// console.log('unseen seen', unseenKanas, seenKanas);

		return [...unseenKanas, ...seenKanas];
	}

	function linearStep(i, maxWeight, minWeight, len) {
		const step = (maxWeight - minWeight) / (len - 1);
		return maxWeight - step * i;
	}

	function exponentialStep(i, maxWeight, minWeight, len) {
		const base = (maxWeight / minWeight) ** (1 / (len - 1));
		return maxWeight / base ** i;
	}

	function logStep(i, maxWeight, minWeight, len) {
		const base = Math.log(maxWeight / minWeight) / (len - 1);
		return maxWeight / Math.exp(base * i);
	}


	function selectWeightedElement(arr, minWeight = 1, maxWeight = 100) {
		const len = arr.length;

		// Create a weight array
		const weights = [];
		for (let i = 0; i < len; i++) {
			// Calculate weight step (difference between weights for adjacent elements)
			const step = exponentialStep(i, maxWeight, minWeight, len);
			weights.push(step);

			// Add the weight to the kana itself
			if (typeof arr[i] === 'object') {
				arr[i].weight = weights[i];
			}

			// Add the weight to the kana stats
			if (!stats.value.kanas[arr[i].kana]) {
				stats.value.kanas[arr[i].kana] = { weight: weights[i] };
			} else {
				stats.value.kanas[arr[i].kana].weight = weights[i];
			}
		}

		// console.log('weighted arr', arr);

		// Calculate the total weight sum for normalization
		const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

		// Generate a random number and find the corresponding element
		let random = Math.random() * totalWeight;
		for (let i = 0; i < len; i++) {
			if (random < weights[i]) {
				return arr[i];
			}
			random -= weights[i];
		}
		return arr[len - 1]; // Fallback (in case of rounding errors)
	}

	function selectWeightedKana(incrementSeen = true) {
		if (enabledKanas.value.length === 0) {
			getEnabledKanas();
		}
		if (enabledKanas.value.length === 0) return { kana: '', romaji: '' };

		// Update stats
		editStats(incrementSeen);

		const tempList = sortEnabledKanas();
		if (tempList.length === 0) {
			// probably only 'n' selected
			tempList.push(...enabledKanas.value);
		}

		const kana = selectWeightedElement(tempList);

		// console.log(stats.value);

		selectedKana.value = kana;
		return kana;
	}

	function getEnabledKanas() {
		const sections = enabledKanaSections.value;
		const list = []
		for (const section of sections) {
			const [type, num] = section.split('_-_');
			const kanaOfType = allKana[type];
			const kanaGroups = kanaOfType.filter((_, i) => i === num - 1).flat();
			list.push(...kanaGroups.filter(kana => kana && kana.kana !== ''));
		}
		enabledKanas.value = list;
		// console.log(list);
		return list;
	}

	function editStats(incrementSeen) {
		if (!selectedKana.value?.kana) return;
		const previous = stats.value.kanas[selectedKana.value.kana];
		if (previous?.seen) {
			if (incrementSeen) {
				previous.seen++;
			}
			previous.averageTime = ((previous.averageTime * (previous.seen - 1)) + (Date.now() - startTime.value)) / previous.seen;
			return;
		}
		if (!previous) {
			stats.value.kanas[selectedKana.value.kana] = {
				seen: incrementSeen ? 1 : 0,
				averageTime: startTime.value ? Date.now() - startTime.value : 0
			};
			return;
		}
		if (incrementSeen) {
			previous.seen = previous.seen || 1;
		} else {
			previous.seen = 0;
		}
		previous.averageTime = startTime.value ? Date.now() - startTime.value : 0;
	}

	function selectRandomKana(incrementSeen) {
		if (enabledKanas.value.length === 0) {
			getEnabledKanas();
		}
		if (enabledKanas.value.length === 0) return { kana: '', romaji: '' };
		const tempList = [...enabledKanas.value.filter(kana => kana && kana.kana !== selectedKana.value.kana)];
		if (tempList.length === 0) {
			// probably only 'n' selected
			tempList.push(...enabledKanas.value);
		}
		const kana = tempList[Math.floor(Math.random() * tempList.length)];

		editStats(incrementSeen);

		selectedKana.value = kana;
		return kana;
	}

	function toggleSection(section) {
		if (enabledKanaSections.value.includes(section)) {
			enabledKanaSections.value = enabledKanaSections.value.filter((id) => id !== section);
			if (enabledKanaSections.value.length === 0) {
				enabledKanaSections.value.push('hiragana_-_1');
			}
		} else {
			enabledKanaSections.value.push(section);
		}
		getEnabledKanas();
	}

	async function saveSession() {
		saveSections();
		try {
			const list = [];
			for (const kana of getAllKanas(true)) {
				if (!stats.value.kanas[kana] && !previousSessionStats.value.kanas[kana]) continue;
				const correct = stats.value.kanas[kana]?.correct || 0;
				const seen = stats.value.kanas[kana]?.seen || 0;
				const averageTime = stats.value.kanas[kana]?.averageTime || 0;

				const previousCorrect = previousSessionStats.value.kanas[kana]?.correct || 0;
				const previousSeen = previousSessionStats.value.kanas[kana]?.seen || 0;
				const previousAverageTime = previousSessionStats.value.kanas[kana]?.averageTime || 0;

				const newCorrect = correct + previousCorrect;
				const newSeen = seen + previousSeen;
				const newAverageTime = ((averageTime * seen) + (previousAverageTime * previousSeen)) / (seen + previousSeen);

				list.push({
					kana,
					correct: newCorrect,
					seen: newSeen,
					averageTime: newAverageTime,
				});
			}
			await db.kanaStats.bulkPut(list);
		} catch (e) {
			console.error(e);
		}
	}

	async function loadSession() {
		loadSections();
		try {
			const list = await db.kanaStats.toArray();
			previousSessionStats.value.total = 0;
			previousSessionStats.value.correct = 0;
			for (const kana of list) {
				previousSessionStats.value.kanas[kana.kana] = kana;
				previousSessionStats.value.total += kana.seen;
				previousSessionStats.value.correct += kana.correct;
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function resetDb() {
		try {
			await db.kanaStats.clear();
		} catch (e) {
			console.error(e);
		}
	}

	function saveSections() {
		const encodedString = btoa(JSON.stringify(enabledKanaSections.value));
		if (!encodedString) return;
		window.localStorage.setItem('learn-kana.enabledKanaSections', encodedString);
	}

	function loadSections() {
		const encodedString = window.localStorage.getItem('learn-kana.enabledKanaSections');
		if (!encodedString) return;
		enabledKanaSections.value = JSON.parse(atob(encodedString));
	}

	return {
		enabledKanaSections,
		enabledKanas,
		selectedKana,
		startTime,
		stats,
		previousSessionStats,
		toggleSection,
		selectRandomKana,
		getEnabledKanas,
		getCurrentKanaStats,
		selectWeightedKana,
		saveSession,
		loadSession,
		resetDb,
		saveSections,
	};
});
