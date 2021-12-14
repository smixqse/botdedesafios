import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export const getRandomNumberBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomFrom = <I>(array: I[]) =>
  array[getRandomNumberBetween(0, array.length - 1)];

export const removeDuplicates = <I>(array: I[]) => [...new Set(array)];

export const removeDuplicatesBy = <A>(
  keyFn: (x: A) => A[keyof A],
  array: A[]
) => {
  const mySet = new Set();
  return array.filter(function (x) {
    const key = keyFn(x),
      isNew = !mySet.has(key);
    if (isNew) mySet.add(key);
    return isNew;
  });
};

export interface EventModule {
  data: typeof SlashCommandBuilder;
  run: (interaction: CommandInteraction) => void;
}

export interface Indexable {
  [key: string]: any;
}