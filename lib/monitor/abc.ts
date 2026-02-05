import { ServerLogger } from '@/lib/logger/server';
import type { MessageClient } from '@/lib/messaging';
import type { BaseMonitorParams, MonitorResponse } from '@/lib/monitor';

export abstract class Monitor<Params extends BaseMonitorParams = BaseMonitorParams> {
  protected readonly messageClient: MessageClient;
  protected readonly logger: ServerLogger;
  protected constructor(
    public readonly params: Params,
    messageClient: MessageClient
  ) {
    this.messageClient = messageClient;
    this.logger = new ServerLogger(messageClient);
  }
  abstract check(): Promise<MonitorResponse<Params['kind']>>;
}
