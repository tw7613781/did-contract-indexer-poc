const fs = require('fs');

// 读取 domains.json 文件
const data = JSON.parse(fs.readFileSync('domains.json', 'utf8'));

// 创建一个 Set 来存储唯一的 note 值
const uniqueNotes = new Set();

// 遍历所有 domains
data.domains.forEach(domain => {
  uniqueNotes.add(domain.note);
});

// 转换为数组并输出
const notesList = Array.from(uniqueNotes);

console.log('所有不同的 note 值：');
console.log('='.repeat(50));
notesList.forEach((note, index) => {
  console.log(`${index + 1}. "${note}"`);
});
console.log('='.repeat(50));
console.log(`总共有 ${notesList.length} 种不同的 note 值`);
