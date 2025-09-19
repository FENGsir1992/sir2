import { db } from '../src/database/init.js';

async function main() {
	const limit = Number(process.argv[2] || 5);
	const rows = await db('workflows')
		.select('id','title','code','status','createdAt')
		.orderBy('createdAt','desc')
		.limit(limit);
	console.log(JSON.stringify(rows, null, 2));
}

main().then(()=>process.exit(0)).catch((e)=>{ console.error(e); process.exit(1); });


