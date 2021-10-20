export default {
  events: {
    enabled: true,
    channels: ['422418934202105858'],
    time: 15000,
    winPoints: [25, 50, 75],
    disable: [],
    colors: {
      normal: '#d49234',
      rare: '#9c229c'
    },
    // {0} = A ganhou X pontos, A e B ganharam X pontos, ninguém ganhou
    genericMessages: {
      won: ['boa! {0}.', 'aí sim! {0}.', 'que rapidez, hein? {0}.'],
      lost: [
        'que pena, ninguém ganhou...',
        'acabou o tempo! ninguém ganhou.',
        'demoraram demais, vocês têm que ser mais rápidos da próxima vez!'
      ]
    }
  },
  guild: '420378219854823424',
  client: '471342697232203777',
  owner: '205319106608627722'
};
