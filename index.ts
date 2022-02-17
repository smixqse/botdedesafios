require('dotenv').config();
import { Client } from 'discord.js';
import enmap from 'enmap';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import config from './config';
const Enmap = require('enmap') as typeof enmap;
export const client = new Client({
  intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS'],
  presence: { status: 'invisible' }
});

export const channelTracking = new Enmap<
  string,
  {
    messageCount: number;
    nextMessageCount: number;
    nextIntervention?:
      | {
          channel: string;
          type: 'steal' | 'remove';
          creator: string;
        }
      | {
          channel: string;
          type: 'bet';
          creator: string;
          bet: string;
        };
  }
>({ name: 'channelTracking' });

export const users = new Enmap<
  string,
  { points: number; noInterventions?: boolean }
>({ name: 'users' });

(async () => {
  console.log('preparing events...');
  const eventFiles = readdirSync(resolve('./events'));
  for (const fileName of eventFiles) {
    const fileNameWithoutExtension = fileName.slice(0, -3);
    const imported: { event: () => void; once: boolean } = (
      await import(resolve(`./events/${fileNameWithoutExtension}`))
    ).default;
    if (imported.once) {
      client.once(fileNameWithoutExtension, imported.event);
    } else {
      client.on(fileNameWithoutExtension, imported.event);
    }
  }
})();

client.login(process.env.TOKEN);
