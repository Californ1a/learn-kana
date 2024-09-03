import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import allKana from '../assets/kana.json';

export const useStore = defineStore('store', () => {
	const enabledKanaSections = ref([]);
	const enabledKanas = ref([]);
	const selectedKana = ref({ kana: '', romaji: '' });
	const stats = ref({});
	stats.value.total = 0;
	stats.value.correct = 0;
	const startTime = ref(null);

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
		return list;
	}

	function selectRandomKana(incrementSeen = true) {
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

		if (selectedKana.value?.kana) {
			const previous = stats.value[selectedKana.value.kana];
			if (previous?.seen) {
				if (incrementSeen) {
					previous.seen++;
				}
				previous.averageTime = (previous.averageTime * (previous.seen - 1) + (Date.now() - startTime.value)) / previous.seen;
			} else {
				if (!previous) {
					stats.value[selectedKana.value.kana] = {
						seen: incrementSeen ? 1 : 0,
						averageTime: startTime.value ? Date.now() - startTime.value : 0
					};
				} else {
					if (incrementSeen) {
						previous.seen = previous.seen || 1;
					} else {
						previous.seen = 0;
					}
					previous.averageTime = startTime.value ? Date.now() - startTime.value : 0;
				}
			}
		}

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

	return {
		enabledKanaSections,
		enabledKanas,
		selectedKana,
		startTime,
		stats,
		toggleSection,
		selectRandomKana,
		getEnabledKanas,
	};
});
