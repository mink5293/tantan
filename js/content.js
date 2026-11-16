// All personal content and original asset paths live here.
// Keep the supplied "assests" directory spelling: it is intentional.
const mascotDirectory = "assests/gif_mascot/";
const mediaDirectory = "assests/gifts_envelop/";

export const mascots = {
  welcome: {
    image: `${mascotDirectory}01_welcome_envelope.gif`,
    still: `${mascotDirectory}Cat-eared boy offering a pink envelope-1.png`,
    alt: "Your cat-eared Roblox friend offering a heart-sealed envelope",
  },
  introduction: {
    image: "",
    still: `${mascotDirectory}Mascot sprite sheet with six envelopes-10.png`,
    alt: "Your Roblox friend sitting beside a stack of six pink envelopes",
  },
  menu: {
    image: `${mascotDirectory}03_menu_wave.gif`,
    still: `${mascotDirectory}Cat-Eared Boy Waving Sprite Sheet-4.png`,
    alt: "Your Roblox friend waving hello",
  },
  longDay: {
    image: `${mascotDirectory}04_long_day_rest.gif`,
    still: `${mascotDirectory}Sleepy cat-eared boy hugging pink cushion-9.png`,
    alt: "Your sleepy Roblox friend hugging a pink cushion",
  },
  smile: {
    image: `${mascotDirectory}05_smile_present.gif`,
    still: `${mascotDirectory}Cheeky Cat-Eared Mascot Animation Sheet-3.png`,
    alt: "Your Roblox friend presenting a very serious gift with a cheeky smile",
  },
  chaos: {
    image: `${mascotDirectory}06_chaos_jump.gif`,
    still: `${mascotDirectory}Chibi cat-eared mascot jump cycle-2.png`,
    alt: "Your Roblox friend jumping happily",
  },
  company: {
    image: `${mascotDirectory}07_company_cushion.gif`,
    still: `${mascotDirectory}Cat-eared boy invites you to sit-6.png`,
    alt: "Your Roblox friend sitting beside an empty pink cushion",
  },
  appreciation: {
    image: `${mascotDirectory}08_you_matter_flower.gif`,
    still: `${mascotDirectory}Shy cat-eared boy sprite sheet-7.png`,
    alt: "Your Roblox friend holding a small flower with a shy smile",
  },
  lastLetter: {
    image: `${mascotDirectory}09_last_envelope.gif`,
    still: `${mascotDirectory}Cat-eared mascot hugs a letter-8.png`,
    alt: "Your Roblox friend hugging a pink envelope",
  },
};

export const introduction = {
  welcome: {
    eyebrow: "special delivery",
    heading: "I made you a little something.",
    description: "For after the long day. Before I start annoying you again.",
    button: "What is it? →",
    aside: "A gift from your favorite nuisance.",
  },
  surprise: {
    eyebrow: "okay, here goes...",
    heading: "Ready for your tiny surprise?",
    description: "Six envelopes. A few memories. An unreasonable amount of effort from your supposedly unserious friend.",
    button: "Let me see →",
    aside: "Yes, I can be thoughtful. Terrifying, I know.",
  },
};

export const letters = [
  {
    id: "01",
    label: "you’ve had a long day",
    heading: "Open when you’ve had a long day",
    mediaType: "image",
    mediaSource: `${mediaDirectory}Screenshot_20261114_004017_Roblox.jpg`,
    mediaAlt: "Our two Roblox avatars sharing a quiet moment in the grass",
    caption: "a quiet little moment",
    messageParagraphs: [
      "Hey, responsible human. You did enough today. Put the world down for a minute.",
      "We met in Roblox, and somehow you became one of the best parts of logging in. You deserve a little peace after all that hard work.",
      "Yes, this is me being nice. Please don’t ruin my reputation.",
    ],
    signature: "— your usual nuisance",
    mascotImage: mascots.longDay.image,
  },
  {
    id: "02",
    label: "you need a smile",
    heading: "Open when you need a smile",
    mediaType: "video",
    mediaSource: `${mediaDirectory}snaptik_7707256025312726279_v3.mp4`,
    mediaAlt: "A very serious cow video, chosen to make you smile",
    caption: "a very serious gift",
    messageParagraphs: [
      "I was going to send something elegant. Then I found this cow. A serious artistic decision, obviously.",
      "If today was rude to you, here’s nineteen seconds of absolutely no responsibilities. I hope it steals a smile.",
      "Yes, I built a whole website to deliver a cow. You’re welcome.",
    ],
    signature: "— your usual nuisance",
    mascotImage: mascots.smile.image,
  },
  {
    id: "03",
    label: "you miss our chaos",
    heading: "Open when you miss our chaos",
    mediaType: "image",
    mediaSource: `${mediaDirectory}Screenshot_20261113_231807_Roblox.jpg`,
    mediaAlt: "Our two Roblox avatars together under a golden sunset",
    caption: "same game. better company.",
    messageParagraphs: [
      "Somewhere between random games and ridiculous jokes, hanging out with you became something I looked forward to.",
      "You’re the sensible one. I’m the reason that’s a full-time job. Thanks for making even a random sunset worth saving.",
      "I’d write something cooler, but you’ve already seen me play.",
    ],
    signature: "— your usual nuisance",
    mascotImage: mascots.chaos.image,
  },
  {
    id: "04",
    label: "you need company",
    heading: "Open when you need company",
    mediaType: "video",
    mediaSource: `${mediaDirectory}Screen_Recording_20261114_221945_Roblox.mp4`,
    mediaAlt: "A recording of us spending time together in Roblox",
    caption: "doing nothing, together",
    messageParagraphs: [
      "You don’t have to be funny, productive, or okay every time we talk.",
      "We can play, ramble, or do absolutely nothing. I’m good with any of it. If you want company, your usual nuisance is around.",
      "Premium friendship. Very questionable commentary. Somehow still free.",
    ],
    signature: "— your usual nuisance",
    mascotImage: mascots.company.image,
  },
  {
    id: "05",
    label: "you forget you matter",
    heading: "Open when you forget you matter",
    mediaType: "video",
    mediaSource: `${mediaDirectory}Screen_Recording_20261114_225131_Roblox.web.mp4`,
    mediaAlt: "A saved Roblox memory with the friend I’m glad I met",
    caption: "glad this game led me to you",
    messageParagraphs: [
      "You handle a lot, and I hope you give yourself credit for it.",
      "I’m glad a random game introduced me to you. The jokes are fun, but having you as a friend is the part I treasure. You deserve kindness on ordinary days, too.",
      "Anyway, enough sincerity. This is terrible for my mysterious image.",
    ],
    signature: "— your usual nuisance",
    mascotImage: mascots.appreciation.image,
  },
  // ENVELOPE 06 — the person behind the avatar. Personalize this letter here.
  // mediaType: "image" or "video"; mediaSource: a relative path or HTTPS URL.
  // Each string in messageParagraphs becomes a separate paragraph.
  // Empty values are omitted from the website, with no placeholders.
  {
    id: "06",
    label: "one last thing...",
    heading: "One last thing...",
    mediaType: "image",
    mediaSource: `${mediaDirectory}f5360a31-6772-4aa7-b5b2-f869433fe871.jpg`,
    mediaAlt: "A mirror selfie of your usual nuisance, holding a phone and wearing a black sleeveless shirt",
    caption: "the nuisance behind the avatar",
    messageParagraphs: [
      "A little proof that your usual nuisance exists outside Roblox. The questionable jokes, unfortunately, work offline too.",
      "I’m really glad we met. You’ve made ordinary games into memories I wanted to keep, and I hope this little collection gives you a smile whenever you come back to it.",
      "Okay, that’s enough sincerity from me. Go get some rest. I’ll be here, preparing my next deeply unserious contribution to your day.",
    ],
    signature: "— your usual nuisance, beyond the pixels",
    mascotImage: mascots.lastLetter.image,
  },
];
