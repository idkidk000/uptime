import { eq, getTableColumns, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { type DataHistory, type DataTransfer, dataTransferJsonSchema } from '@/app/api/data-transfer/schema';
import { db } from '@/lib/drizzle';
import { jsonMapper } from '@/lib/drizzle/queries';
import {
  groupTable,
  groupToNotifierTable,
  historyTable,
  notifierTable,
  serviceTable,
  serviceToTagTable,
  tagTable,
} from '@/lib/drizzle/schema';
import { ServerLogger } from '@/lib/logger/server';
import { MessageClient } from '@/lib/messaging';
import { formatError, omit, pick } from '@/lib/utils';

type DataTransferKind = 'settings' | 'history' | 'schema';
type DataTransferGetResponse<Kind extends DataTransferKind> =
  | (Kind extends 'settings'
      ? DataTransfer
      : Kind extends 'history'
        ? DataHistory[]
        : Kind extends 'schema'
          ? Record<string, unknown>
          : never)
  | { ok: false; error: string };

const messageClient = await MessageClient.newAsync(import.meta.url);
const logger = new ServerLogger(messageClient);

/** not wrapped in an ApiResponse since the response is downloaded to a file */
export async function GET<Kind extends DataTransferKind>(
  _request: NextRequest,
  { params }: { params: Promise<{ kind: Kind | string }> }
): Promise<NextResponse<DataTransferGetResponse<Kind>>> {
  const { kind } = await params;
  type Response = DataTransferGetResponse<Kind>;
  switch (kind) {
    case 'history': {
      try {
        const data: DataHistory[] = await db
          .select({ ...omit(getTableColumns(historyTable), ['serviceId']), name: serviceTable.name })
          .from(serviceTable)
          .innerJoin(historyTable, eq(historyTable.serviceId, serviceTable.id));
        return NextResponse.json(data as Response);
      } catch (error) {
        logger.error(error);
        return NextResponse.json({ ok: false, error: formatError(error) }, { status: 500 });
      }
    }
    case 'settings': {
      try {
        const settings = messageClient.settings;
        const services = await db
          .select({
            ...omit(getTableColumns(serviceTable), ['id', 'groupId', 'createdAt', 'updatedAt']),
            groupName: groupTable.name,
            tags: sql<string[]>`iif (count(${tagTable.id}) > 0, json_group_array(${tagTable.name}), '[]')`.mapWith(
              jsonMapper
            ),
          })
          .from(serviceTable)
          .innerJoin(groupTable, eq(groupTable.id, serviceTable.groupId))
          .leftJoin(serviceToTagTable, eq(serviceToTagTable.serviceId, serviceTable.id))
          .leftJoin(tagTable, eq(tagTable.id, serviceToTagTable.tagId))
          .groupBy(serviceTable.id);
        const notifiers = await db
          .select(omit(getTableColumns(notifierTable), ['createdAt', 'id', 'updatedAt']))
          .from(notifierTable);
        const groups = await db
          .select({
            ...pick(getTableColumns(groupTable), ['name']),
            notifiers: sql<
              string[]
            >`iif (count(${notifierTable.id})>0, json_group_array(${notifierTable.name}), '[]')`.mapWith(jsonMapper),
          })
          .from(groupTable)
          .leftJoin(groupToNotifierTable, eq(groupToNotifierTable.groupId, groupTable.id))
          .leftJoin(notifierTable, eq(notifierTable.id, groupToNotifierTable.notifierId))
          .groupBy(groupTable.id);
        const data: DataTransfer = { settings, notifiers, groups, services };
        return NextResponse.json(data as Response);
      } catch (error) {
        logger.error(error);
        return NextResponse.json({ ok: false, error: formatError(error) }, { status: 500 });
      }
    }
    case 'schema': {
      return NextResponse.json(dataTransferJsonSchema as unknown as Response);
    }
    default: {
      logger.error('unhandled kind', kind);
      return NextResponse.json({ ok: false, error: 'Error: Invalid data transfer kind' }, { status: 400 });
    }
  }
}
