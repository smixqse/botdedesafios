require('dotenv').config();
import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import config from './config';

const { clientId: client, guildId: guild } = config;

const commands: {}[] = [];

(async () => {
  console.log('preparing commands...');
  const eventFiles = readdirSync(resolve('./commands'));
  for (const fileName of eventFiles) {
    const fileNameWithoutExtension = fileName.slice(0, -3);
    const imported: {
      data: SlashCommandBuilder;
      ownerOnly: true;
    } = (await import(resolve(`./commands/${fileNameWithoutExtension}`)))
      .default;

    commands.push(imported.data.toJSON());
    //if (imported.ownerOnly) enablePermissions.push('a');
    console.log(commands);
  }

  const rest = new REST({ version: '9' }).setToken(process.env.TOKEN || '');

  rest
    .put(Routes.applicationGuildCommands(client, guild), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);

  rest
    .get(Routes.applicationGuildCommands(client, guild))
    .then((response) => {
      const typedResponse = response as any;
      const permissions = typedResponse
        .filter((a: any) => a.default_permission === false)
        .map((a: any) => {
          return {
            id: a.id,
            permissions: [{ id: config.ownerId, type: 2, permission: true }]
          };
        });
      console.log(permissions);
      rest
        .put(Routes.guildApplicationCommandsPermissions(client, guild), {
          body: permissions
        })
        .then(() =>
          console.log('Successfully registered application permissions.')
        )
        .catch(console.error);
    })
    .catch(console.error);
})();
