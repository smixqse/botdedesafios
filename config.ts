export default {
  events: {
    enabled: true,
    channels: ['422418934202105858'],
    time: 15000,
    winPoints: [25, 50, 75],
    disabledEvents: [],
    colors: {
      normal: '#d49234',
      rare: '#9c229c'
    },
    interventionMessages: {
      steal: 'mas {0} roubou seus pontos. que pena!',
      betWin: 'e {0} ganhou o dobro por apostar em você!',
      betLose: 'mas {0} perdeu por ter apostado em outra pessoa.',
      betNoWinner: 'e {0} perdeu por ter apostado em alguém.'
    }
    // {0} = A ganhou X pontos, A e B ganharam X pontos, ninguém ganhou
    /*genericMessages: {
      won: ['boa! {0}.', 'aí sim! {0}.', 'que rapidez, hein? {0}.'],
      lost: [
        'que pena, ninguém ganhou...',
        'acabou o tempo! ninguém ganhou.',
        'demoraram demais, vocês têm que ser mais rápidos da próxima vez!'
      ]
    }*/
  },
  guildId: '420378219854823424',
  clientId: '471342697232203777',
  ownerId: '205319106608627722'
};
