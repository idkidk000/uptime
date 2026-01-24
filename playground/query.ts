import { sql } from 'drizzle-orm';
import { db } from '@/lib/drizzle';
import { getLatencySql, getMiniHistory, getUptimeSql, LatencySelect, UptimeSelect } from '@/lib/drizzle/queries';
import { MiniHistory, serviceTable } from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';

const logger = new ServerLogger(import.meta.url);
const { uptime1d, uptime30d }: UptimeSelect = await db.get(getUptimeSql(1));
const { latency1d }: LatencySelect = await db.get(getLatencySql(1));
const miniHist = await getMiniHistory(1, 5);

logger.plain({ uptime1d, uptime30d, latency1d, miniHist });
