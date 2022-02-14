import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ColorResolvable,
  CommandInteraction,
  InteractionReplyOptions,
  MessageComponentInteraction,
  MessageEmbed,
  MessageEmbedFooter,
  User
} from 'discord.js';
import { client, points } from '..';
import config from '../config';

const buildRanking = async (
  page: number,
  author: User
): Promise<InteractionReplyOptions> => {
  const authorPoints = points.ensure(author.id, {
    points: 0
  });

  const sortedPoints = points
    .map((a, b) => {
      return { ...a, user: b };
    })
    .sort((a, b) => b.points - a.points);
  const filteredPoints = sortedPoints.filter((a) => a.points !== 0);
  const pageCount = Math.floor(filteredPoints.length / 10 + 1);
  const startSlice = 0 + 10 * page - 10;
  const top10 = filteredPoints.slice(startSlice, startSlice + 10);
  if (top10.length < 1) {
    return {
      ephemeral: true,
      content: `essa página não existe. a última página é a ${pageCount}.`
    };
  }

  const topMessage = `você tem ${authorPoints.points} pontos e é o ${
    sortedPoints.findIndex((a) => a.user === author.id) + 1
  }º no ranking.`;
  const winnerEmojis = '🥇 🥈 🥉'.split(' ');
  const conditionalBold = (text: string, condition: boolean) =>
    `${condition ? '**' : ''}${text}${condition ? '**' : ''}`;
  const addWinnerEmojis = (text: string, position: number | null) =>
    position !== null ? `${winnerEmojis[position]} ${text}` : text;

  for (const i of top10) {
    await client.users.fetch(i.user);
  }

  const description =
    topMessage +
    '\n\n' +
    top10
      .map((a, b) => {
        const fetchedUser = client.users.resolve(a.user);

        return fetchedUser
          ? addWinnerEmojis(
              conditionalBold(
                `${b + 1 + (page - 1) * 10}º: ${fetchedUser} - ${a.points}`,
                a.user === author.id
              ),
              page === 1 && b < 3 ? b : null
            )
          : '';
      })
      .join('\n');

  return {
    ephemeral: true,
    embeds: [
      (() =>
        new MessageEmbed()
          .setTitle('Ranking')
          .setDescription(description)
          .setColor(config.color as ColorResolvable))().setFooter({
        text: `página ${page} de ${pageCount}`
      })
    ],
    components: [
      {
        type: 'ACTION_ROW',
        components: [
          {
            type: 'BUTTON',
            label: '◀',
            style: 'PRIMARY',
            customId: 'prev',
            disabled: page === 1
          },
          {
            type: 'BUTTON',
            label: '▶',
            style: 'PRIMARY',
            customId: 'next',
            disabled: page === pageCount
          }
        ]
      }
    ]
  };
};

export default {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Mostra o ranking de pontos dos membros (incluindo o seu)')
    .setDefaultPermission(true)
    .addIntegerOption((option) =>
      option
        .setName('página')
        .setDescription('A página desejada')
        .setRequired(false)
    ),
  run: async (interaction: CommandInteraction) => {
    const author = interaction.user;
    interaction.reply(
      await buildRanking(interaction.options.getInteger('página') || 1, author)
    );
  },
  sendInteraction: async (interaction: MessageComponentInteraction) => {
    if (interaction.isButton()) {
      interaction.update(
        await buildRanking(
          Number(
            (
              interaction.message.embeds[0].footer as MessageEmbedFooter
            ).text.split(' ')[1]
          ) + (interaction.customId === 'prev' ? -1 : 1),
          interaction.user
        )
      );
    }
  }
};
