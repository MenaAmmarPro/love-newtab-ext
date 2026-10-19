"use strict";

/*
 * love-newtab-ext — bundled content.
 *
 * A reason-a-day and a small pool of quotes. Both are plain arrays so the
 * deterministic "reason of the day" is just date % length.
 */

(function () {
  var reasons = [
    "Because your laugh is the first sound I look for in a day.",
    "Because you make the ordinary feel like something worth keeping.",
    "Because you were my favourite person before I even knew your name.",
    "Because you say you like white, and somehow it suits you perfectly.",
    "Because art looks more honest when you talk about it.",
    "Because you chose pizza over anything fancy, and that's love.",
    "Because you find calm in nature, and quiet in the small things.",
    "Because we met in a game and stayed for the real thing.",
    "Because Romania and Pakistan aren't so far when you're on the line.",
    "Because you remember the little details no one else would.",
    "Because your good morning is worth the time difference.",
    "Because you never make me feel like I'm too much.",
    "Because you're brave in ways you don't even notice.",
    "Because you keep growing, and I love watching it.",
    "Because you are kind to people who can't do anything for you.",
    "Because you've made a home in my head where the quiet lives.",
    "Because you make waiting feel like something I can do.",
    "Because your voice softens every room it's in.",
    "Because you forgive me faster than I deserve.",
    "Because you are the reason I write anything at all.",
    "Because you'd rather have an evening of nothing than a night of noise.",
    "Because you care about the planet and the people on it.",
    "Because you still get excited about small good news.",
    "Because you tell me the truth, even when it's a soft one.",
    "Because you make me want to be a gentler person.",
    "Because you're the person I want to tell everything to first.",
    "Because your name feels like something I've always known.",
    "Because you sleep late and I love your tired voice.",
    "Because you are patient with a distance that isn't fair.",
    "Because you look for beauty and usually find it.",
    "Because you'd rather fix a thing than replace it.",
    "Because you make silence comfortable.",
    "Because you have a whole world inside your head, and you let me in.",
    "Because you never ask me to be anyone else.",
    "Because you said yes to something that didn't have a map.",
    "Because you're still here, and still ours, since forever.",
    "Because you make me believe in slow things that last.",
    "Because your hello fixes a whole afternoon.",
    "Because you are, simply, my favourite thought.",
    "Because you are Himena, and that has always been enough."
  ];

  var quotes = [
    "Love is a quiet thing that shows up every day.",
    "Bloom where you are planted.",
    "The best of us is the kindest of us.",
    "Distance means so little when someone means so much.",
    "You are my favourite kind of ordinary.",
    "Somewhere, right now, the sky is the same colour for both of us.",
    "Home is wherever we're finally in the same room.",
    "All art is a little bit of a love letter.",
    "Time zones teach patience; love teaches everything else.",
    "Be gentle with yourself, love.",
    "The moon is proof that you can be far and still full.",
    "Small hours, small talks, big love.",
    "I'd rather have a slow forever than a fast maybe.",
    "Kindness is the cheapest and the rarest thing.",
    "Wherever you are is the place I want to be.",
    "We are each other's quiet.",
    "Every good story is just two people choosing each other again.",
    "Come what may, we look after each other.",
    "You grow in the direction of what you love.",
    "The heart keeps its own time zone.",
    "Hold the people you love like they're weather.",
    "A shared pizza is a whole language.",
    "Nature doesn't hurry, and nothing in it is late.",
    "I loved you before I met you, and I'll mean it after too."
  ];

  var root = typeof globalThis !== "undefined" ? globalThis : this;
  root.MenaNewTabData = { reasons: reasons, quotes: quotes };
})();
