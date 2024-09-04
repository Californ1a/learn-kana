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
			previous.averageTime = (previous.averageTime * (previous.seen - 1) + (Date.now() - startTime.value)) / previous.seen;
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

	function calculateWeight(correctPercentage, seen, averageTime) {
		// If correctPercentage is NaN or invalid, default to 0 (assumes no correct answers yet)
		if (isNaN(correctPercentage)) correctPercentage = 0;
		if (correctPercentage === 1) correctPercentage = 0.99;
		if (isNaN(seen)) seen = 0;
		if (isNaN(averageTime)) averageTime = 1000; // Default averageTime

		// return (1 - correctPercentage) + (1 / (seen + 1)) + (averageTime / 1000);
		// return (1 - correctPercentage) + Math.exp(-seen) + (averageTime / 1000);
		// return (1 - correctPercentage) + (1 / Math.pow(seen + 1, 2)) + (averageTime / 1000);
		return (1 - correctPercentage) + (5 / (seen + 1)) + ((averageTime / 1000) / 60);
		// return (1 - correctPercentage) + (1 / Math.log(seen + 2)) + (averageTime / 1000);
	}

	function normalizeWeights(weightedKanas) {
		const minWeight = 1;
		const maxWeight = 100;

		// Get the minimum and maximum weight values from the calculated weights
		let minCalculatedWeight = Math.min(...weightedKanas.map(k => k.weight));
		let maxCalculatedWeight = Math.max(...weightedKanas.map(k => k.weight));

		return weightedKanas.map(kanaObj => {
			// Scale the weights between minWeight and maxWeight
			const normalizedWeight = ((kanaObj.weight - minCalculatedWeight) / (maxCalculatedWeight - minCalculatedWeight)) * (maxWeight - minWeight) + minWeight;
			return {
				...kanaObj,
				weight: normalizedWeight
			};
		});
	}

	function selectWeightedKana(incrementSeen = true) {
		if (enabledKanas.value.length === 0) {
			getEnabledKanas();
		}
		if (enabledKanas.value.length === 0) return { kana: '', romaji: '' };

		// Update stats
		editStats(incrementSeen);

		const tempList = [...enabledKanas.value.filter(kana => kana && kana.kana !== selectedKana.value.kana)];
		if (tempList.length === 0) {
			// probably only 'n' selected
			tempList.push(...enabledKanas.value);
		}

		let weightedKanas = [];

		for (const kanaObj of tempList) {
			const kana = kanaObj.kana;
			const stat = stats.value.kanas[kana];
			const previousStat = previousSessionStats.value.kanas[kana];

			// If kana doesn't have stats yet, give it a higher weight
			let weight;
			if (!stat && !previousStat) {
				weight = 100;
			} else {
				const seen = (stat?.seen || 0) + (previousStat?.seen || 0);
				const correct = (stat?.correct || 0) + (previousStat?.correct || 0);
				const averageTime = (stat?.averageTime || 0);
				const previousAverageTime = (previousStat?.averageTime || 0);
				const previousSeen = (previousStat?.seen || 0);
				const newAverageTime = ((averageTime * seen) + (previousAverageTime * previousSeen)) / (seen + previousSeen);
				const correctPercentage = seen > 0 ? correct / seen : 0;
				weight = calculateWeight(correctPercentage, seen, newAverageTime);
			}

			weightedKanas.push({ kana, weight });
		}

		// Normalize weights after calculating them
		weightedKanas = normalizeWeights(weightedKanas);

		// Put weights into stats
		for (const kanaObj of weightedKanas) {
			// console.log(weights[i].kana, weights[i].weight);
			if (!stats.value.kanas[kanaObj.kana]) {
				stats.value.kanas[kanaObj.kana] = { weight: kanaObj.weight };
			} else {
				stats.value.kanas[kanaObj.kana].weight = kanaObj.weight;
			}
		}

		// console.log(stats.value);
		// console.log(previousSessionStats.value);

		// Calculate total weight after normalization
		let totalWeight = weightedKanas.reduce((sum, obj) => sum + obj.weight, 0);

		// Pick a kana based on normalized weights
		const randomValue = Math.random() * totalWeight;
		let cumulativeWeight = 0;

		for (const kanaObj of weightedKanas) {
			cumulativeWeight += kanaObj.weight;
			if (randomValue <= cumulativeWeight) {
				const selected = tempList.find(kana => kana && kana.kana === kanaObj.kana);
				selectedKana.value = selected;
				return selected;
			}
		}

		// Fallback to random selection if no kana is selected
		const randomKana = tempList[Math.floor(Math.random() * tempList.length)];
		selectedKana.value = randomKana;
		return randomKana;
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
