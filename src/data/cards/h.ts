import type { Flashcard } from '../../types';

// ===== H: Holidays (125–128) =====
export const CARDS_H: Flashcard[] = [
  { id: 125, q: "What is Independence Day?", cat: "H",
    answers: ["A holiday to celebrate U.S. independence (from Britain)", "The country's birthday"], requires: 1 },
  { id: 126, q: "Name three national U.S. holidays.", cat: "H",
    answers: ["New Year's Day", "Martin Luther King, Jr. Day", "Presidents' Day", "Memorial Day", "Independence Day", "Labor Day", "Columbus Day", "Veterans Day", "Thanksgiving", "Christmas"], requires: 3 },
  { id: 127, q: "What is Memorial Day?", cat: "H",
    answers: ["A holiday to honor soldiers who died in military service"], requires: 1 },
  { id: 128, q: "What is Veterans Day?", cat: "H",
    answers: ["A holiday to honor people in the (U.S.) military", "A holiday to honor people who have served (in the U.S. military)"], requires: 1 },
];
