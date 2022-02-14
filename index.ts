require('dotenv').config();
import { Client } from 'discord.js';
import { Intervention } from './chatEvents';
import enmap from 'enmap';
const Enmap = require('enmap') as typeof enmap;
import { readdirSync } from 'fs';
import { resolve } from 'path';
export const client = new Client({
  intents: ['GUILDS', 'GUILD_MESSAGES'],
  presence: { status: 'invisible' }
});

export const channelTracking = new Enmap<
  string,
  {
    messageCount: number;
    nextMessageCount: number;
    nextIntervention?: Intervention;
  }
>({ name: 'channelTracking' });

export const points = new Enmap<string, { points: number }>({ name: 'points' });

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
