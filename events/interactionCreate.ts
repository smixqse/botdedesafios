import { Interaction } from 'discord.js';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import { EventModule } from '../utils';

const commands = new Map<string, EventModule['run']>();

(async () => {
  console.log('preparing commands...');
  const eventFiles = readdirSync(resolve('./commands'));
  for (const fileName of eventFiles) {
    const fileNameWithoutExtension = fileName.slice(0, -3);
    const imported: EventModule = (
      await import(resolve(`./commands/${fileNameWithoutExtension}`))
    ).default;
    commands.set(fileNameWithoutExtension, imported.run);
  }
})();

const event = (interaction: Interaction) => {
  if (interaction.isCommand()) {
    const name = interaction.commandName;
    if (commands.has(name)) {
      const command = commands.get(name);
      if (command) command(interaction);
    }
  }
};

export default {
  event,
  once: false
};
