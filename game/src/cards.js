// The card pool of Lanternfall. Twenty designs, two copies of each, one deck of 40.
// Four elements, told apart by colour AND shape, never by text alone:
//   ember  ▲ red    — aggression, direct damage
//   tide   ≋ blue   — card draw, control
//   thorn  ✿ green  — healing, growth
//   stone  ◆ slate  — guardians, board control
//
// A creature's numbers are attack / health. A spell's text names its target:
// "any target" means a creature or a lantern; "a creature" means a creature only.

export const ELEMENTS = {
  ember: { label: 'Ember', glyph: '▲', color: '#e5484d', soft: '#fdeceb' },
  tide: { label: 'Tide', glyph: '≋', color: '#2f7fe0', soft: '#e8f1fd' },
  thorn: { label: 'Thorn', glyph: '✿', color: '#2e9e5b', soft: '#e6f6ec' },
  stone: { label: 'Stone', glyph: '◆', color: '#7a8699', soft: '#eef1f5' },
};

export const CARDS = [
  { id: 'cinder-imp', name: 'Cinder Imp', el: 'ember', type: 'creature', cost: 1, atk: 2, hp: 1, text: 'Quick and careless.' },
  { id: 'tide-sprite', name: 'Tide Sprite', el: 'tide', type: 'creature', cost: 1, atk: 1, hp: 2, text: 'Draw a card when played.', onPlay: 'draw' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', el: 'thorn', type: 'creature', cost: 1, atk: 1, hp: 3, text: 'Restore 1 flame when played.', onPlay: 'heal1' },
  { id: 'pebble-guard', name: 'Pebble Guard', el: 'stone', type: 'creature', cost: 1, atk: 1, hp: 4, text: 'Guardian — strike it first.', guardian: true },
  { id: 'flame-hound', name: 'Flame Hound', el: 'ember', type: 'creature', cost: 2, atk: 3, hp: 2, text: 'It hunts what glows.' },
  { id: 'river-serpent', name: 'River Serpent', el: 'tide', type: 'creature', cost: 2, atk: 2, hp: 3, text: 'Draw a card when played.', onPlay: 'draw' },
  { id: 'bramble-wolf', name: 'Bramble Wolf', el: 'thorn', type: 'creature', cost: 2, atk: 2, hp: 2, text: 'Restore 2 flame when played.', onPlay: 'heal2' },
  { id: 'granite-golem', name: 'Granite Golem', el: 'stone', type: 'creature', cost: 3, atk: 2, hp: 5, text: 'Guardian — strike it first.', guardian: true },
  { id: 'phoenix', name: 'Phoenix', el: 'ember', type: 'creature', cost: 3, atk: 4, hp: 3, text: 'Deal 1 damage to a random foe.', onPlay: 'ping' },
  { id: 'storm-heron', name: 'Storm Heron', el: 'tide', type: 'creature', cost: 3, atk: 3, hp: 3, text: 'Draw a card when played.', onPlay: 'draw' },
  { id: 'elder-treant', name: 'Elder Treant', el: 'thorn', type: 'creature', cost: 4, atk: 4, hp: 5, text: 'Restore 3 flame when played.', onPlay: 'heal3' },
  { id: 'mountain-titan', name: 'Mountain Titan', el: 'stone', type: 'creature', cost: 5, atk: 6, hp: 6, text: 'Guardian — strike it first.', guardian: true },
  { id: 'fireball', name: 'Fireball', el: 'ember', type: 'spell', cost: 2, text: 'Deal 3 damage to any target.', spell: 'damage3', target: 'any' },
  { id: 'healing-rain', name: 'Healing Rain', el: 'tide', type: 'spell', cost: 2, text: 'Restore 4 flame.', spell: 'heal4', target: 'self' },
  { id: 'thornsnare', name: 'Thornsnare', el: 'thorn', type: 'spell', cost: 2, text: 'Deal 2 damage to a creature.', spell: 'damage2', target: 'creature' },
  { id: 'quake', name: 'Quake', el: 'stone', type: 'spell', cost: 3, text: 'Deal 2 to every enemy creature.', spell: 'quake', target: 'none' },
  { id: 'ember-surge', name: 'Ember Surge', el: 'ember', type: 'spell', cost: 1, text: 'Draw 2 cards.', spell: 'draw2', target: 'none' },
  { id: 'lanterns-blessing', name: "Lantern's Blessing", el: 'thorn', type: 'spell', cost: 3, text: 'Restore 6 flame.', spell: 'heal6', target: 'self' },
  { id: 'frostbind', name: 'Frostbind', el: 'tide', type: 'spell', cost: 2, text: 'Deal 2 to any target. Draw a card.', spell: 'damage2draw', target: 'any' },
  { id: 'meteor', name: 'Meteor', el: 'ember', type: 'spell', cost: 5, text: 'Deal 6 damage to any target.', spell: 'damage6', target: 'any' },
];

export function cardById(id) {
  return CARDS.find((card) => card.id === id);
}

// One deck: two copies of every design, in a fixed order before the shuffle.
export function buildDeck() {
  const deck = [];
  for (const card of CARDS) deck.push(card.id, card.id);
  return deck;
}
