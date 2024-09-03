<template>
	<tr>
		<th>
			<span class="stat-label">{{ label }}</span>
		</th>
		<td>
			<span class="correct">{{ (correct || 0).toLocaleString() }}</span> / <span class="total">{{ (seen || 0).toLocaleString() }}</span> <span :class="(weight) ? 'script' : ''"><sup v-if="seen" class="percent" :style="{ color: getPercentColor }">({{ percent.toFixed(2) }}%)</sup><sub v-if="weight" class="weight">({{ weight.toFixed(2) }})</sub></span>
		</td>
	</tr>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	label: {
		type: String,
		required: true
	},
	correct: {
		type: Number,
		required: false,
		default: 0
	},
	seen: {
		type: Number,
		required: false,
		default: 0
	},
	weight: {
		type: Number,
		required: false,
		default: 0
	}
});

const percent = computed(() => (props.correct / props.seen * 100));

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
	return getColor(percent.value);
});
</script>

<style scoped>
#stats td {
	border: 1px solid var(--dark-color);
	background-color: var(--background-color);
	box-shadow: var(--box-shadow);
}

#stats th {
	border: 1px solid var(--dark-color);
}

.script {
	position: relative;
}

.script sup,
.script sub {
	position: absolute;
	left: 0.5em;
}

.script sup {
	top: -0.6em;
}

.script sub {
	top: 0.5em;
}
</style>
