import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from './config';

require('dotenv').config();

const { clientId: client, guildId: guild } = config;

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN || '');

rest
  .put(Routes.applicationGuildCommands(client, guild), { body: {} })
  .then(() => console.log('Successfully removed application commands.'))
  .catch(console.error);
