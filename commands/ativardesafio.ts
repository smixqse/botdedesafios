import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { ChallengeName, challenges } from '../chatEvents';
import { startChallenge } from '../chatEvents';
import { getRandomFrom, Indexable } from '../utils';

const options: [name: string, value: string][] = Object.keys(challenges).map(
  (a) => [a, a]
);

export default {
  data: new SlashCommandBuilder()
    .setName('ativardesafio')
    .setDescription('Ativa um desafio do chat.')
    .setDefaultPermission(false)
    .addStringOption((option) =>
      option
        .setName('desafio')
        .setDescription('O desafio para ativar')
        .addChoices(options)
        .setRequired(false)
    ),
  run: async (interaction: CommandInteraction) => {
    const eventNames = Object.keys(challenges) as ChallengeName[];
    const challengeToStart =
      interaction.options.getString('desafio') || getRandomFrom(eventNames);
    interaction.reply({
      content: `rodando desafio ${challengeToStart}`,
      ephemeral: true
    });
    startChallenge(
      challengeToStart as ChallengeName,
      interaction.channel as TextChannel,
      interaction.member as GuildMember,
      (challenges as Indexable)[challengeToStart].run
    );
  }
};
