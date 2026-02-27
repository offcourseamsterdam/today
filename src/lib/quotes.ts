export interface BurkemanQuote {
  text: string
  source?: string
}

export const BURKEMAN_QUOTES: BurkemanQuote[] = [
  {
    text: 'The world is already full of people who work endlessly and never feel they\u2019ve done enough.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'You have to accept that there will always be too much to do \u2014 and that this is not a problem to be solved.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'The real measure of any time management technique is whether it helps you neglect the right things.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Productivity is a trap. Becoming more efficient just makes you more rushed.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'The day will never arrive when you finally have everything under control.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'You don\u2019t get to choose the things that matter in your life and then wait until conditions are perfect before actually doing them.',
    source: 'The Imperfectionist',
  },
  {
    text: 'The most productive people I know don\u2019t try to get everything done. They\u2019re just really good at choosing what not to do.',
  },
  {
    text: 'Limit your work in progress. Put a hard upper limit on the number of things you\u2019re working on.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'You teach yourself patience by being patient.',
    source: 'The Imperfectionist',
  },
  {
    text: 'The core challenge of managing our limited time isn\u2019t about how to get everything done \u2014 that\u2019s never going to happen \u2014 but how to decide wisely what not to do.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Three or four hours of daily creative work is about the most you can expect from yourself.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'You\u2019ll do more meaningful work by setting firm boundaries on your working day.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'It\u2019s precisely the fact that you don\u2019t have time for everything that makes it possible to focus on what matters.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Attention just is life: your experience of being alive consists of nothing other than the sum of everything to which you pay attention.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'It\u2019s only by facing our finitude that we can step into a truly authentic relationship with life.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Stop when your daily time is up, even when you\u2019re bursting with energy and feel as though you could carry on.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'We plan compulsively because the alternative is confronting how little control over the future we really have.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Any finite life \u2014 even the best one you could possibly imagine \u2014 is a matter of ceaselessly waving goodbye to possibility.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Choose uncomfortable enlargement over comfortable diminishment whenever you can.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'In an age of instrumentalization, the hobbyist is a subversive: she insists that some things are worth doing for themselves alone.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'Patience becomes a form of power. In a world geared for hurry, the capacity to resist the urge to hurry is a superpower.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'You need to learn how to start saying no to things you do want to do, with the recognition that you have only one life.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'In order to most fully inhabit the only life you ever get, you have to refrain from using every spare hour for personal growth.',
    source: 'Four Thousand Weeks',
  },
  {
    text: 'The effort to feel happy is often precisely the thing that makes us miserable.',
    source: 'The Antidote',
  },
  {
    text: 'True security lies in the unrestrained embrace of insecurity \u2014 in the recognition that we never really stand on solid ground, and never can.',
    source: 'The Antidote',
  },
  {
    text: 'Uncertainty is where things happen. It is where the opportunities \u2014 for success, for happiness, for really living \u2014 are waiting.',
    source: 'The Antidote',
  },
  {
    text: 'Resisting a task is usually a sign that it\u2019s meaningful \u2014 which is why it\u2019s awakening your fears and stimulating procrastination.',
    source: 'The Antidote',
  },
  {
    text: 'Once you stop struggling to get on top of everything, you\u2019re rewarded with the time, energy and psychological freedom to accomplish the most of which anyone could be capable.',
    source: 'Meditations for Mortals',
  },
  {
    text: 'When you give up the unwinnable struggle to do everything, that\u2019s when you can start pouring your finite time and attention into a handful of things that truly count.',
    source: 'Meditations for Mortals',
  },
  {
    text: 'The only two questions, at any moment of choice in life, are what the price is, and whether or not it\u2019s worth paying.',
    source: 'Meditations for Mortals',
  },
  {
    text: 'In an age of attention scarcity, the greatest act of good citizenship may be learning to withdraw your attention from everything except the battles you\u2019ve chosen to fight.',
    source: 'Meditations for Mortals',
  },
]

// Get a quote based on the day of year (deterministic rotation)
export function getTodayQuote(): BurkemanQuote {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return BURKEMAN_QUOTES[dayOfYear % BURKEMAN_QUOTES.length]
}

// Get a random quote (for variety in different positions)
export function getRandomQuote(seed?: number): BurkemanQuote {
  const index = seed !== undefined
    ? Math.abs(seed) % BURKEMAN_QUOTES.length
    : Math.floor(Math.random() * BURKEMAN_QUOTES.length)
  return BURKEMAN_QUOTES[index]
}
