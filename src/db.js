import Dexie from 'dexie';

export const db = new Dexie('learn-kana');
db.version(1).stores({
	kanaStats: 'kana, seen, correct, averageTime',
});
