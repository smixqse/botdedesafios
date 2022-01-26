import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  GuildChannel} from 'discord.js';
import { challenges } from '../chatEvents';

const options: [name: string, value: string][] = Object.keys(challenges).map(
  (a) => [a, a]
);

export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Faz o bot falar algo em algum canal de texto.')
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
