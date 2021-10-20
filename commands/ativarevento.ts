import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { EventName, events } from '../chatEvents';
import { getRandomFrom, getRandomNumberBetween, Indexable } from './../utils';
import { runEvent } from './../chatEvents';

const options: [name: string, value: string][] = Object.keys(events).map(
  (a) => [a, a]
);

export default {
  data: new SlashCommandBuilder()
    .setName('ativarevento')
    .setDescription('Ativa um evento do chat.')
    .setDefaultPermission(false)
    .addStringOption((option) =>
      option
        .setName('evento')
        .setDescription('O evento para ativar')
        .addChoices(options)
        .setRequired(false)
    ),
  run: async (interaction: CommandInteraction) => {
    const eventNames = Object.keys(events) as EventName[];
    const eventToRun = (interaction.options.getString('evento') ||
      getRandomFrom(eventNames));
    interaction.reply({
      content: `rodando evento ${eventToRun}`,
      ephemeral: true
    });
    runEvent(
      'math',
      interaction.member as GuildMember,
      interaction.channel as TextChannel,
      (events as Indexable)[eventToRun].run
    );
  }
};
