import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  GuildChannel,
  GuildMember,
  TextChannel
} from 'discord.js';
import { EventName, events } from '../chatEvents';
import { getRandomNumberBetween, Indexable } from './../utils';
import { runEvent } from './../chatEvents';
import { ChannelTypes } from 'discord.js/typings/enums';

const options: [name: string, value: string][] = Object.keys(events).map(
  (a) => [a, a]
);

export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Faz o RobôDoCore falar algo em algum canal de texto.')
    .setDefaultPermission(false)
    .addStringOption((option) =>
      option
        .setName('mensagem')
        .setDescription('A mensagem para enviar')
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('O canal em que a mensagem será enviada')
        .setRequired(false)
        .addChannelType(0)
    ),
  run: async (interaction: CommandInteraction) => {
    const channel =
      (interaction.options.getChannel('canal') as GuildChannel) ||
      interaction.channel;
    if (channel.isText()) {
      channel.send(interaction.options.getString('mensagem') || '');
      interaction.reply({ ephemeral: true, content: 'mensagem enviada' });
    } else {
      interaction.reply({
        ephemeral: true,
        content: 'escolha um canal de texto'
      });
    }
  }
};
